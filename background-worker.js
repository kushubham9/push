;(function() {
var src_background_worker;
src_background_worker = function () {
  var splitEndPointSubscription = function (subscriptionDetails) {
    var endpointURL = 'https://android.googleapis.com/gcm/send/', endpoint = subscriptionDetails.endpoint, subscriptionId;
    if (endpoint.indexOf(endpointURL) === 0) {
      return endpoint.replace(endpointURL, '');
    }
    return subscriptionDetails.subscriptionId;
  };
  function syncChromeEncryptionKeys() {
    self.registration.pushManager.getSubscription().then(function (subscription) {
      if (subscription) {
        var subscriptionId = splitEndPointSubscription(subscription);
        var subscriptionJson = JSON.stringify(subscription);
        var subscriptionObj = JSON.parse(subscriptionJson);
        //We are removing subscriberLanguage for now as issue in chrome service.
        var subscriberTimeZone = '';
        var subscriberTimeZoneOffset = '';
        try {
          // if (typeof jstz !== 'undefined' || jstz !== null){
          //     subscriberTimeZone = jstz.determine().name();
          // }
          var subscriberTimeZoneOffset = new Date().getTimezoneOffset().toString().replace('+', '');
        } catch (err) {
        }
        if (subscriptionObj.keys.auth && subscriptionObj.keys.p256dh) {
          return fetch(_wingifyPush.trackingUrl + '/syncChromeEncryptionKey.php?hash=' + _wingifyPush.hash + '&subscriptionId=' + subscriptionId + '&subscription=' + subscriptionJson + '&subscriberTimeZone=' + subscriberTimeZone + '&subscriberTimeZoneOffset=' + subscriberTimeZoneOffset).catch(function (err) {
          });
        }
      }
    });
  }
  syncChromeEncryptionKeys();
  var trackDelivery = function (trackDeliveryURL) {
    return fetch(trackDeliveryURL).catch(function (err) {
    });
  };
  var trackError = function (logSwErrorUrl) {
    return fetch(logSwErrorUrl).catch(function (err) {
    });
  };
  var trackClick = function (clickDeliveryURL) {
    return fetch(clickDeliveryURL).catch(function (err) {
    });
  };
  var trackClickEvent = function (event) {
    return self.registration.pushManager.getSubscription().then(function (subscription) {
      var subscriptionId = splitEndPointSubscription(subscription), clickDeliveryURL = '';
      if (event.action) {
        clickDeliveryURL = _wingifyPush.trackingUrl + '/trackClick.php' + '?subscriptionId=' + subscriptionId + '&notificationTag=' + event.notification.tag + '&hash=' + _wingifyPush.hash + '&action=' + event.action;
      } else {
        clickDeliveryURL = _wingifyPush.trackingUrl + '/trackClick.php' + '?subscriptionId=' + subscriptionId + '&notificationTag=' + event.notification.tag + '&hash=' + _wingifyPush.hash;
      }
      return Promise.all([trackClick(clickDeliveryURL)]);
    });
  };
  var showPushCrewNotification = function (notificationDetails) {
    var notificationFinalDetails = {
      body: notificationDetails.message,
      icon: notificationDetails.icon,
      requireInteraction: notificationDetails.requireInteraction,
      tag: notificationDetails.notificationTag,
      actions: notificationDetails.actions,
      data: notificationDetails.data
    };
    if ('image' in Notification.prototype && notificationDetails.image) {
      // Image is supported.
      notificationFinalDetails.image = notificationDetails.image;
    }
    return self.registration.showNotification(notificationDetails.title, notificationFinalDetails);
  };
  // This looks to see if the current is already open and
  // focuses if it is
  var openNotificaitionClickedWindow = function (notificationURL) {
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
  var showErrorNotification = function (errorString, subscriptionId) {
    var notificationDetails = {};
    notificationDetails.title = 'Oops! We couldn\'t fetch the notification';
    notificationDetails.message = 'Sorry, due to some error the notification that was sent couldn\'t be displayed.';
    notificationDetails.icon = _wingifyPush.defaultIcon;
    notificationDetails.notificationTag = 'notification-error';
    notificationDetails.requireInteraction = false;
    notificationDetails.data = {};
    notificationDetails.data.notificationURL = encodeURIComponent('https://pushcrew.com/error-fetching-push-notifications/?hash=' + _wingifyPush.hash);
    var logSwErrorUrl = _wingifyPush.trackingUrl + '/logServiceWorkerError.php' + '?subscriptionId=' + subscriptionId + '&error=' + errorString + '&hash=' + _wingifyPush.hash;
    return fetch(logSwErrorUrl).then(function () {
      return showPushCrewNotification(notificationDetails);
    }).catch(function (err) {
      return showPushCrewNotification(notificationDetails);
    });
  };
  // This method will be call for push event with or without payload.
  var commonNotificationHandlerForPushEvent = function (eventData, subscriptionId) {
    var notificationDetails = {};
    var subscriberId = eventData.subscriber_id || eventData.subscriberId;
    var requireInteraction = typeof eventData.ri_flag !== 'undefined' ? eventData.ri_flag : eventData.requireInteraction;
    var icon = eventData.icon_url || eventData.icon;
    notificationDetails.title = eventData.title;
    notificationDetails.message = eventData.message;
    notificationDetails.notificationTag = eventData.tag;
    notificationDetails.icon = icon;
    notificationDetails.image = eventData.image || '';
    notificationDetails.requireInteraction = true;
    notificationDetails.subscriberId = typeof subscriberId !== 'undefined' ? subscriberId : null;
    notificationDetails.actions = [];
    notificationDetails.data = {};
    notificationDetails.data.notificationURL = encodeURIComponent(eventData.url);
    notificationDetails.data.subscriberId = notificationDetails.subscriberId;
    //Below two if blocks are present for the CTA buttons
    if (eventData.button_one && eventData.button_one_url) {
      notificationDetails.actions.push({
        action: 'action1',
        title: eventData.button_one
      });
      notificationDetails.data.action_one_url = encodeURIComponent(eventData.button_one_url);
    }
    if (eventData.button_two && eventData.button_two_url) {
      notificationDetails.actions.push({
        action: 'action2',
        title: eventData.button_two
      });
      notificationDetails.data.action_two_url = encodeURIComponent(eventData.button_two_url);
    }
    //Below block is present for checking if auto hide is true or false
    if (requireInteraction === false) {
      notificationDetails.requireInteraction = false;
    }
    var trackDeliveryURL = '';
    trackDeliveryURL = _wingifyPush.trackingUrl + '/trackDelivery.php' + '?subscriptionId=' + subscriptionId + '&subscriberId=' + notificationDetails.subscriberId + '&notificationTag=' + notificationDetails.notificationTag + '&hash=' + _wingifyPush.hash + '&medium=payload';
    return fetch(trackDeliveryURL).then(function () {
      return showPushCrewNotification(notificationDetails);
    }).catch(function (err) {
      return showPushCrewNotification(notificationDetails);
    });
  };
  self.addEventListener('push', function (event) {
    event.waitUntil(self.registration.pushManager.getSubscription().then(function (subscription) {
      try {
        if (!subscription) {
          throw new Error('Subsription not found in service worker');
        }
        var subscriptionId = splitEndPointSubscription(subscription);
        if (event.data) {
          if (typeof event.data.json() != 'object') {
            throw new Error('Not a valid JSON data');
          }
          // Payload data is present process it directly. It is true for chrome_version > 50
          var payloadObject = event.data.json();
          return commonNotificationHandlerForPushEvent(payloadObject, subscriptionId);
        } else {
          // Payload data is not present get data from our server and process it. It will be obsilite soon.
          return fetch(_wingifyPush.trackingUrl + '/getMessage.php?hash=' + _wingifyPush.hash + '&subscriptionId=' + subscriptionId).then(function (response) {
            if (response.status !== 200) {
              throw new Error();
            }
            return response.json().then(function (data) {
              var trackDeliveryURL = '';
              if (data.error || !data.notification) {
                throw new Error('The API returned an error.');
              }
              if (data.notification.tag === 'notification-error') {
                throw new Error('Tag is notification-error');
              }
              return commonNotificationHandlerForPushEvent(data.notification, subscriptionId);
            }).catch(function (err) {
              return showErrorNotification(err.toString(), subscriptionId);
            });
          }).catch(function (err) {
            return showErrorNotification(err.toString(), subscriptionId);
          });
        }
      } catch (err) {
        return showErrorNotification(err.toString(), subscriptionId);
      }
    }));
  });
  self.addEventListener('notificationclick', function (event) {
    var notificationURL;
    event.notification.close();
    if (event.action == 'action1') {
      notificationURL = event.notification.data.action_one_url;
    } else if (event.action == 'action2') {
      notificationURL = event.notification.data.action_two_url;
    } else {
      notificationURL = event.notification.data.notificationURL;
    }
    event.waitUntil(Promise.all([
      trackClickEvent(event),
      openNotificaitionClickedWindow(notificationURL)
    ]));
  });
}();
}());