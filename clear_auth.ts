import { dbStore } from './src/db/local_store.ts';

const users = dbStore.getUsers();
users.forEach(user => {
  user.shhPass = {
    priority: [],
    passkeys: [],
    totpEnabled: false,
    securityKeyEnabled: false,
    securityQuestions: []
  };
  dbStore.updateUser(user.id, user);
});
console.log('Cleared all auth methods for all users.');
