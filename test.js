var Promise       = require('bluebird');
var promise1 = Promise.resolve(3);
var promise2 = 42;
var promise3 = new Promise(function(resolve, reject) {
  setTimeout(resolve, 10000000, 'foo');
});

Promise.all([promise3, promise2, promise1]).then(function(values) {
  console.log(values);
});
