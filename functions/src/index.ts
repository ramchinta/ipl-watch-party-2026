import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

export const onMatchResultUpdated = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const matchId = context.params.matchId
    const tossJustSet = !before.tossWinner && after.tossWinner
    const resultJustSet = !before.result && after.result
    if (!tossJustSet && !resultJustSet) return null
    const predsSnap = await db.collection('predictions').where('matchId', '==', matchId).get()
    if (predsSnap.empty) return null
    const batch = db.batch()
    for (const predDoc of predsSnap.docs) {
      const pred = predDoc.data()
      const scoreRef = db.doc(`scores/${pred.partyId}_${pred.userId}`)
      const scoreSnap = await scoreRef.get()
      if (!scoreSnap.exists) continue
      const score = scoreSnap.data()!
      let tossPoints = score.tossPoints || 0
      let matchPoints = score.matchPoints || 0
      if (tossJustSet && pred.tossWinner && pred.tossWinner === after.tossWinner) tossPoints += 10
      if (resultJustSet && pred.matchWinner && pred.matchWinner === after.result?.winner) matchPoints += 20
      const bonusPoints = score.bonusPoints || 0
      batch.update(scoreRef, {
        tossPoints, matchPoints,
        totalPoints: tossPoints + matchPoints + bonusPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
    await batch.commit()
    return null
  })

export const onUserProfileUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    if (before.name === after.name && before.favoriteTeam === after.favoriteTeam) return null
    const scoresSnap = await db.collection('scores').where('userId', '==', context.params.userId).get()
    if (scoresSnap.empty) return null
    const batch = db.batch()
    scoresSnap.forEach(doc => {
      batch.update(doc.ref, {
        userName: after.name,
        favoriteTeam: after.favoriteTeam || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })
    await batch.commit()
    return null
  })

export const registerHost = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
  const { name, inviteCode } = data
  const uid = context.auth.uid
  const configSnap = await db.doc('config/hostInvite').get()
  const validCode = configSnap.exists ? configSnap.data()?.code : null
  if (!validCode) throw new functions.https.HttpsError('failed-precondition', 'Host registration is not configured. Contact admin.')
  if (!inviteCode || inviteCode.trim().toUpperCase() !== validCode.toUpperCase()) throw new functions.https.HttpsError('permission-denied', 'Invalid invite code')
  if (!name || name.trim().length < 2) throw new functions.https.HttpsError('invalid-argument', 'Name must be at least 2 characters')
  const existing = await db.doc(`users/${uid}`).get()
  if (existing.exists) {
    const role = existing.data()?.role
    if (role === 'admin') throw new functions.https.HttpsError('already-exists', 'Already an admin')
    if (role === 'host') throw new functions.https.HttpsError('already-exists', 'Already a host')
  }
  await admin.auth().setCustomUserClaims(uid, { role: 'host' })
  await db.doc(`users/${uid}`).set({
    uid, email: context.auth.token.email || null, name: name.trim(),
    role: 'host', profileComplete: true, joinedParties: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  return { success: true }
})

export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.role || context.auth.token.role !== 'admin') throw new functions.https.HttpsError('permission-denied', 'Only admins can assign roles')
  const { uid, role } = data
  if (!uid || !['admin', 'host', 'user'].includes(role)) throw new functions.https.HttpsError('invalid-argument', 'Invalid uid or role')
  await admin.auth().setCustomUserClaims(uid, { role })
  await db.doc(`users/${uid}`).update({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  return { success: true }
})

export const setHostInviteCode = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.role || context.auth.token.role !== 'admin') throw new functions.https.HttpsError('permission-denied', 'Only admins can set the invite code')
  const { code } = data
  if (!code || code.trim().length < 4) throw new functions.https.HttpsError('invalid-argument', 'Code must be at least 4 characters')
  await db.doc('config/hostInvite').set({
    code: code.trim().toUpperCase(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.uid
  })
  return { success: true }
})

export const bootstrapAdmin = functions.https.onCall(async (data, context) => {
  const { uid, secretKey } = data
  const expectedKey = functions.config().app?.admin_secret || process.env.ADMIN_BOOTSTRAP_SECRET
  if (!expectedKey || secretKey !== expectedKey) throw new functions.https.HttpsError('permission-denied', 'Invalid secret key')
  await admin.auth().setCustomUserClaims(uid, { role: 'admin' })
  await db.doc(`users/${uid}`).set({
    uid, role: 'admin', name: 'Admin', profileComplete: true, joinedParties: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  return { success: true }
})
