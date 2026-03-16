import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()
const db = admin.firestore()

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER: When a match document is updated with a result, score all predictions
// ─────────────────────────────────────────────────────────────────────────────
export const onMatchResultUpdated = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const matchId = context.params.matchId

    // Only fire when result is newly set or tossWinner newly set
    const tossJustSet = !before.tossWinner && after.tossWinner
    const resultJustSet = !before.result && after.result

    if (!tossJustSet && !resultJustSet) return null

    functions.logger.info(`Scoring match ${matchId} — toss: ${tossJustSet}, result: ${resultJustSet}`)

    // Get all predictions for this match
    const predsSnap = await db.collection('predictions')
      .where('matchId', '==', matchId)
      .get()

    if (predsSnap.empty) {
      functions.logger.info('No predictions found for match', matchId)
      return null
    }

    const batch = db.batch()

    for (const predDoc of predsSnap.docs) {
      const pred = predDoc.data()
      const scoreRef = db.doc(`scores/${pred.partyId}_${pred.userId}`)
      const scoreSnap = await scoreRef.get()

      if (!scoreSnap.exists()) continue

      const score = scoreSnap.data()!
      let tossPoints = score.tossPoints || 0
      let matchPoints = score.matchPoints || 0

      // Award toss points if toss result was just set
      if (tossJustSet && pred.tossWinner && after.tossWinner) {
        if (pred.tossWinner === after.tossWinner) {
          tossPoints += 10
        }
      }

      // Award match points if result was just set
      if (resultJustSet && pred.matchWinner && after.result?.winner) {
        if (pred.matchWinner === after.result.winner) {
          matchPoints += 20
        }
      }

      const bonusPoints = score.bonusPoints || 0
      const totalPoints = tossPoints + matchPoints + bonusPoints

      batch.update(scoreRef, {
        tossPoints,
        matchPoints,
        totalPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()
    functions.logger.info(`Scored ${predsSnap.size} predictions for match ${matchId}`)
    return null
  })


// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER: When a user joins a party (score doc created), sync their name
// ─────────────────────────────────────────────────────────────────────────────
export const onUserProfileUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const userId = context.params.userId

    // Only sync if name changed
    if (before.name === after.name && before.favoriteTeam === after.favoriteTeam) return null

    // Find all score docs for this user and update name/team
    const scoresSnap = await db.collection('scores')
      .where('userId', '==', userId)
      .get()

    if (scoresSnap.empty) return null

    const batch = db.batch()
    scoresSnap.forEach(doc => {
      batch.update(doc.ref, {
        userName: after.name,
        favoriteTeam: after.favoriteTeam || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    await batch.commit()
    functions.logger.info(`Synced name for user ${userId} across ${scoresSnap.size} scores`)
    return null
  })


// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: Set user role (admin use only — sets custom claims)
// ─────────────────────────────────────────────────────────────────────────────
export const setUserRole = functions.https.onCall(async (data, context) => {
  // Only existing admins can assign roles
  if (!context.auth?.token?.role || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can assign roles')
  }

  const { uid, role } = data
  if (!uid || !['admin', 'host', 'user'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid uid or role')
  }

  await admin.auth().setCustomUserClaims(uid, { role })

  // Update Firestore user doc
  await db.doc(`users/${uid}`).update({
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  functions.logger.info(`Set role ${role} for user ${uid}`)
  return { success: true }
})


// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: Bootstrap first admin (run once during setup)
// Protected by a secret key set in Firebase environment config
// ─────────────────────────────────────────────────────────────────────────────
export const bootstrapAdmin = functions.https.onCall(async (data, context) => {
  const { uid, secretKey } = data
  const expectedKey = functions.config().app?.admin_secret || process.env.ADMIN_BOOTSTRAP_SECRET

  if (!expectedKey || secretKey !== expectedKey) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid secret key')
  }

  await admin.auth().setCustomUserClaims(uid, { role: 'admin' })
  await db.doc(`users/${uid}`).set({
    uid,
    role: 'admin',
    name: 'Admin',
    profileComplete: true,
    joinedParties: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  functions.logger.info(`Bootstrapped admin for uid ${uid}`)
  return { success: true }
})
