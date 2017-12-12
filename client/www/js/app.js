const applicationKey = 'YOUR_APPLICATION_KEY';
const clientKey = 'YOUR_CLIENT_KEY';
const applicationId = 'LFjLhn8sZS05V76R';
const ncmb = new NCMB(applicationKey, clientKey);

document.addEventListener('DOMContentLoaded', () => {
  const getUserRole = (mailAddress) => {
    return new Promise((res, rej) => {
      const user = ncmb.User.getCurrentUser();
      const UserRole = ncmb.DataStore('UserRole');
      UserRole
        .equalTo('email', mailAddress)
        .fetch()
        .then((userRole) => {
          res(userRole);
        })
        .catch((err) => {
          rej(err);
        })
    });
  };
    
  const app = new Vue({
    el: '#app',
    data: () => {
      const data = {
        loggedIn: false,
        user: {
          email: 'atsushi3@moongift.jp',
          password: 'test'
        },
        report: {
          note: '',
          date: strftime('%Y年%m月%d日'),
          photo: null
        },
        roleName: '',
        roles: [],
        reports: [],
        comment: '',
        showComments: {}
      }
      const user = ncmb.User.getCurrentUser();
      if (user) {
        data.loggedIn = true;
        getUserRole(user.emailAddress)
          .then((userRole) => {
            data.roleName = userRole.role;
          });
      }
      return data;
    },
    methods: {
      login: (e) => {
        e.preventDefault();
        // ログインします
        ncmb.User
          .loginWithMailAddress(app.user.email, app.user.password)
          .then((userData) => {
            app.loggedIn = true;
            if (userData.updated) return;
            return getUserRole(app.user.email);
          })
          .then((userRole) => {
            if (!userRole) return;
            app.roleName = userRole.role;
            
            // ユーザデータの権限を設定します
            const user = ncmb.User.getCurrentUser();
            const acl = new ncmb.Acl;
            acl
              .setRoleReadAccess('admin', true)
              .setRoleWriteAccess('admin', true)
              .setRoleReadAccess(userRole.role, true)
              .setUserReadAccess(user, true)
              .setUserWriteAccess(user, true);
            // ロールデータとユーザはこの後も使うので、
            // スコープを合わせるためにPromise.allを使います
            const promises = [];
            promises.push(user
              .set('acl', acl)
              .set('authData', {})
              .set('updated', true)
              .update());
            promises.push(ncmb.Role
              .equalTo('roleName', userRole.role)
              .fetch()
            );
            return Promise.all(promises);
          })
          .then((results) => {
            if (!results) return;
            // ユーザをあらかじめ指定していたグループに所属させます
            let user, role;
            if (results[0] instanceof ncmb.User) {
              user = results[0];
              role = results[1];
            } else {
              user = results[1];
              role = results[0];
            }
            return role.addUser(user).update();
          })
          .then((e) => {
            
          });
      },
      changePhoto: (e) => {
        app.report.photo = e.target.files[0];
      },
      uploadPhoto: () => {
        return new Promise((res, rej) => {
          if (!app.report.photo) {
            return res('');
          }
          const user = ncmb.User.getCurrentUser();
          const photoName = `${user.objectId}-${app.report.photo.name}`;
          ncmb.File
            .upload(photoName, app.report.photo)
            .then((f) => {
              const url = `https://mb.api.cloud.nifty.com/2013-09-01/applications/${applicationId}/publicFiles/${f.fileName}`;
              return res(url);
            })
            .catch((err) => {
              rej(err);
            })
        });
      },
      loadReports: () => {
        const Report = ncmb.DataStore('Report');
        Report
          .limit(10)
          .fetchAll()
          .then((reports) => {
            app.reports = reports;
          });
      },
      create: (e) => {
        e.preventDefault();
        app
          .uploadPhoto()
          .then((url) => {
            const user = ncmb.User.getCurrentUser();
            const Report = ncmb.DataStore('Report');
            const report = new Report;
            const m = app.report.date.match(/([0-9]{4})年([0-9]{2})月([0-9]{2})日/);
            const acl = new ncmb.Acl;
            acl
              .setRoleReadAccess(app.roleName, true)
              .setRoleReadAccess('admin', true)
              .setRoleWriteAccess('admin', true)
              .setUserReadAccess(user, true)
              .setUserWriteAccess(user, true);
            console.log(user);
            return report
              .set('date', new Date(m[1], parseInt(m[2]) - 1, m[3]))
              .set('note', app.report.note)
              .set('division', app.roleName)
              .set('reporterId', user.objectId)
              .set('reporter', user.mailAddress)
              .set('acl', acl)
              .set('url', url)
              .save();
          })
          .then((data) => {
            app.report = {
              note: '',
              photo: null,
              date: strftime('%Y年%m月%d日')
            };
            alert('日報を登録しました');
          });
      },
      showReport: (objectId) => {
        app.showComments[objectId] = true;
        app.$forceUpdate();
      },
      addComment: (objectId) => {
        const report = app.reports.filter((report) => {
          return report.objectId === objectId;
        })[0];
        const user = ncmb.User.getCurrentUser();
        const Comment = ncmb.DataStore('Commnet');
        const comment = new Comment;

        const acl = new ncmb.Acl();
        acl
          .setRoleReadAccess(app.roleName, true)
          .setRoleReadAccess('admin', true)
          .setRoleWriteAccess('admin', true)
          .setUserReadAccess(user, true)
          .setUserWriteAccess(user, true);
        comment
          .set('reportId', report.objectId)
          .set('acl', acl)
          .addUnique('comments', {
            user: user.mailAddress,
            commnet: app.comment
          })
          .update()
          .then((data) => {
            alert('コメントしました');
            app.comment = null;
          })
      }
    },
    mounted: () => {
    }
  });
  $('#tab a').click(function (e) {
    if ($(e.target).attr("aria-controls") === 'read') {
      app.loadReports();
    }
  });
}, false);
