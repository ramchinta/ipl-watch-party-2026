const admin = require('firebase-admin')
const sa = require('./ipl-watch-party-2026-firebase-adminsdk-fbsvc-74d3f70cc5.json')
admin.initializeApp({ credential: admin.credential.cert(sa) })

const uid = 'deSFUq99FifRiBq19I6bULU9Eg92'

admin.auth().getUser(uid).then(user => {
  console.log('Custom claims:', user.customClaims)
}).catch(e => console.error(e.message))
