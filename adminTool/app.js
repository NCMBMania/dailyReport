const NCMB = require('ncmb');
const config = require('./config');
const ncmb = new NCMB(config.applicationKey, config.clientKey);

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    el: '#app',
    data: {
      loggedIn: false,
      user: {
        loginId: 'adminUser',
        password: 'test'
      },
      email: '',
      roles: [],
      role: '',
      users: []
    },
    methods: {
      login: (e) => {
        e.preventDefault();
        ncmb.User
          .login(app.user.loginId, app.user.password)
          .then((userData) => {
            app.loggedIn = true;
          })
          .catch((err) => {
            alert('ログインに失敗しました。')
          })
      },
      createUser: (e) => {
        e.preventDefault();
        // メールアドレスと部門の連携を残しておく
        const UserRole = ncmb.DataStore('UserRole');
        const userRole = new UserRole;
        userRole
          .set('role', app.role)
          .set('email', app.email)
          .save()
          .then((data) => {
            ncmb.User
              .requestSignUpEmail(app.email)
          })
          .then((d) => {
            app.email = '';
          })
      }
    },
    created: (e) => {
      ncmb.Role
        .fetchAll()
        .then((roles) => {
          app.roles = roles.filter((role) => {
            if (['admin', 'users'].indexOf(role.roleName) === -1) return role;
          });
        });
    }
  });
  
}, false);
