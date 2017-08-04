'use strict';
var _wingifyPush = {
    hash: '7d6b890795fb42cad6db2c90045a69d4',
    trackingUrl: 'https://tracking.pushcrewlocal.com',
    defaultIcon: '/logo_192_by_192.png'
}

;(function() {
var src_ffsw_pushcrew;
src_ffsw_pushcrew = function () {
  /*Function used split subsciption id from endpoint URL*/
  var splitEndPointSubscription = function (subscriptionDetails) {
    var offset = subscriptionDetails.endpoint.lastIndexOf('/');
    var endpointURL = subscriptionDetails.endpoint.substring(0, offset + 1), endpoint = subscriptionDetails.endpoint, subscriptionId;
    if (endpoint.indexOf(endpointURL) === 0) {
      return subscriptionId = endpoint.replace(endpointURL, '');
    }
    return subscriptionDetails.subscriptionId;
  };
  var trackDelivery = function (trackDeliveryURL) {
    return fetch(trackDeliveryURL).catch(function (err) {
    });
  };
  var sendEventDetails = function (eventDetails) {
    var eventDetailsURL = _wingifyPush.trackingUrl + '/pushsubscriptionchange-exec.php';
    var formData = new FormData();
    formData.append('eventDetails', eventDetails);
    return fetch(eventDetailsURL, {
      method: 'POST',
      body: formData
    });
  };
  var trackClick = function (event) {
    self.registration.pushManager.getSubscription().then(function (subscription) {
      var subscriptionId = splitEndPointSubscription(subscription), clickDeliveryURL = _wingifyPush.trackingUrl + '/trackClick.php' + '?subscriptionId=' + subscriptionId + '&notificationTag=' + event.notification.tag + '&browser=firefox&hash=' + _wingifyPush.hash;
      // send update to server
      return Promise.all([fetch(clickDeliveryURL).catch(function (err) {
        })]);
    });
  };
  var showPushCrewNotification = function (data) {
    return self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      tag: data.tag,
      requireInteration: true,
      data: data.data
    });
  };
  // This looks to see if the current is already open and
  // focuses if it is
  var openNotificaitonClickedWindow = function (notificationURL) {
    return clients.matchAll({ type: 'window' }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === decodeURIComponent(notificationURL) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(decodeURIComponent(notificationURL));
      }
    });
  };
  //event listener for Push Notifications
  self.addEventListener('push', function (event) {
    var obj = event.data.json();
    var data = {};
    data.title = decodeURIComponent(escape(obj.title));
    data.body = decodeURIComponent(escape(obj.msg));
    data.icon = obj.icon;
    data.tag = obj.tag;
    data.data = {};
    data.data.notificationURL = encodeURIComponent(obj.url);
    var subscriberId = typeof obj.subscriberId !== 'undefined' ? obj.subscriberId : null;
    data.subscriberId = subscriberId;
    //Track delivery of notifications
    var trackDeliveryURL = _wingifyPush.trackingUrl + '/trackDelivery.php' + '?subscriptionId=' + obj.subscriptionId + '&notificationTag=' + obj.tag + '&browser=firefox&hash=' + _wingifyPush.hash;
    event.waitUntil(Promise.all([
      trackDelivery(trackDeliveryURL),
      showPushCrewNotification(data)
    ]));
  });
  self.addEventListener('notificationclick', function (event) {
    var notificationURL = event.notification.data.notificationURL;
    event.notification.close();
    event.waitUntil(Promise.all([
      trackClick(event),
      openNotificaitonClickedWindow(notificationURL)
    ]));
  });
  //Event listener for subscriptio change
  //Description: Sometimes push subscriptions expire prematurely, without PushSubscription.unsubscribe() being called.
  self.addEventListener('pushsubscriptionchange', function (event) {
    // do something, usually resubscribe to push and
    // send the new subscription details back to the
    // server via XHR or Fetch
    var subscriptionObject = {
      hasNewSubscription: false,
      hasOldSubscription: false
    };
    if (event.oldSubscription) {
      subscriptionObject.hasOldSubscription = true;
      subscriptionObject.oldSubscription = event.oldSubscription;
    }
    if (event.newSubscription) {
      subscriptionObject.hasNewSubscription = true;
      subscriptionObject.newSubscription = event.newSubscription;
    }
    event.waitUntil(Promise.all([sendEventDetails(JSON.stringify({
        event: event,
        subscriptionObject: subscriptionObject
      }))]));
  });
}();
}());