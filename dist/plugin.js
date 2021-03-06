"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/**
 * This is main plugin loading function
 * Feel free to write your own compiler
 */
W.loadPlugin(
/* Mounting options */
{
  "name": "windy-plugin-featuretracker",
  "version": "0.1.0",
  "author": "John C. Kealy",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/johnckealy/windy-plugin-featuretracker"
  },
  "description": "A Windy plugin to manually track features, particularly those that are not resolvable by NWP models.",
  "displayName": "Feature Tracker",
  "hook": "contextmenu"
},
/* HTML */
'<div id="bottom" class="shy left-border right-border radar-wrapper"> <div id="navigator"> <div id="ft-title"> Feature Tracker </div> <div id="comment-box"> <div id="comment-box-text"></div> </div> <div id="reset-button" class="nav-button"> &#8634; Reset </div> <div id="rain-time"></div> <div id="tracks" class="nav-button"> <input id="tracks-cb" class="checkboxs" type="checkbox" name="tracks-cb" value="show" checked> <label for="tracks-cb">Show Tracks</label> </div> </div> </div>',
/* CSS */
'@font-face{font-family:\'Courgette\';font-style:normal;font-weight:400;font-display:swap;src:local(\'Courgette Regular\'),local(\'Courgette-Regular\'),url(https://fonts.gstatic.com/s/courgette/v7/wEO_EBrAnc9BLjLQAUk1VvoP.ttf) format(\'truetype\')}.nav-button{margin:3px .5px 1px .5px;padding:3px 0px 3px 0px;text-align:center;height:100%;width:80px;border-radius:7px;display:inline-block;background-color:rgba(0,0,0,0.5);color:#E8E8E8}.nav-button:hover{color:white}.gps_ring{border:5px solid #8B0000;-webkit-border-radius:100%;height:27px;width:27px;-webkit-animation:pulsate 2s ease-out;-webkit-animation-iteration-count:infinite}.arrow-icon{font-size:50px;color:red;transform-origin:bottom center}#ft-title{font-family:\'Courgette\',cursive;margin:3px .5px 1px .5px;padding:3px 0px 3px 5px;text-align:left;width:220px;border-radius:7px;display:inline-block;background-color:rgba(0,0,0,0.5);color:#FFFF00}#navigator{position:absolute;margin-left:50px;bottom:calc(100vh - 190px);pointer-events:auto}#comment-box{position:relative;width:220px;height:150px;border-radius:12px;background-color:rgba(0,0,0,0.5)}#comment-box-text{transition:.5s opacity;width:220px;height:100px;font-size:16px;padding:5px}#rain-time{position:absolute;top:90px;left:70px;font-size:26px;font-family:serif}#tracks{width:120px}#tracks-cb{height:15px;width:15px}',
/* Constructor */
function () {
  var pluginDataLoader = W.require('pluginDataLoader');

  var broadcast = W.require('broadcast');

  var picker = W.require('picker');

  var map = W.require('map');

  var store = W.require('store');

  var getPosition = function getPosition() {
    return new Promise(function (resolve, reject) {
      var onSuccess = function onSuccess(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var pos = [lat, lng];
        resolve(pos);
      };

      var onError = function onError() {
        console.log('I can\'t get your location info.');
        reject();
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError);
    });
  };

  var pointIcon = L.divIcon({
    className: 'css-icon',
    html: '<div class="gps_ring"></div>',
    iconSize: [12, 12],
    iconAnchor: [13, 13]
  });
  var locationIcon = L.divIcon({
    className: 'css-icon',
    html: '<div style="border: 5px solid blue;" class="gps_ring"></div>',
    iconSize: [12, 12],
    iconAnchor: [13, 13]
  });
  var timestamps = [];
  var latlongs = [];
  var fitlatlons;
  var willRain;
  var lats = [];
  var lons = [];
  var polyline;
  var polyline_m;
  var polylineModel;
  var U;
  var V;
  var mTraj;
  var mGeo;
  var rainTime_f;
  var previous_timestamp = -9999;
  var cbTracks = document.getElementById('tracks-cb');
  var rainTimeDIV = document.getElementById('rain-time');
  getPosition().then(function (position) {
    var loc_x = position[1];
    var loc_y = position[0];
    store.set('overlay', 'radar');
    map.setView([loc_y, loc_x], 10);
    SetText('To begin, first move the slider back in time. \n\nThen, click on a weather feature.');
    var location_marker = L.marker([loc_y, loc_x], {
      icon: locationIcon
    }).addTo(map);
    document.getElementsByClassName('gps_ring');
    var options = {
      key: 'psfAt10AZ7JJCoM3kz0U1ytDhTiLNJN3',
      plugin: 'windy-plugin-maxtemp'
    };
    var load = pluginDataLoader(options);
    var dataOptions = {
      model: store.get('product'),
      lat: loc_y,
      lon: loc_x
    };
    load('airData', dataOptions).then(function (_ref) {
      var data = _ref.data;
      var current_timestamp = store.get('timestamp');
      var tidx = getDataTimeStamp(current_timestamp, data.data.hours);
      U = data.data['wind_u-700h'][tidx];
      V = data.data['wind_v-700h'][tidx];
    });
    map.on('click', function (e) {
      picker.on('pickerOpened', function (latLon) {
        broadcast.fire('rqstClose', 'picker');
      });
      var timestamp = getTimestamp();
      console.log(timestamp, previous_timestamp);

      if (Math.abs(timestamp - previous_timestamp) < 120000) {
        SetText("Did you adjust the time? \u23F0");
      } else if (timestamp.length == 1) {
        SetText("Move forward in time and click on the same feature. Doing this repeatedly should, in general, improve the accuracy. ");
      } else {
        timestamps.push(timestamp);
        previous_timestamp = timestamp;
        var pulsing_marker = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: pointIcon
        }).addTo(map);
        latlongs.push([e.latlng.lat, e.latlng.lng]);
        var zip = [];

        for (var i = 0; i < timestamps.length; i++) {
          zip.push([timestamps[i], latlongs[i]]);
        }

        zip.sort(function (a, b) {
          return a[0] - b[0];
        });

        for (var _i = 0; _i < zip.length; _i++) {
          timestamps[_i] = zip[_i][0];
          latlongs[_i] = zip[_i][1];
        }

        for (var _i2 = 0; _i2 < latlongs.length; _i2++) {
          lats.push(latlongs[_i2][0]);
          lons.push(latlongs[_i2][1]);
        }

        if (lons.length >= 2) {
          console.log("Using manual trajectories...");
          if (polylineModel) map.removeLayer(polylineModel);

          var _linearFit = linearFit(lons, lats),
              _linearFit2 = _slicedToArray(_linearFit, 2),
              fitlons = _linearFit2[0],
              fitlats = _linearFit2[1];

          var dt = Math.max.apply(Math, _toConsumableArray(timestamps)) - Math.min.apply(Math, _toConsumableArray(timestamps));
          fitlatlons = fitlons.map(function (e, i) {
            return [fitlats[i], e];
          });

          if (fitlatlons.length > 2) {
            if (polyline) map.removeLayer(polyline);
            if (polyline_m) map.removeLayer(polyline_m);
          }

          if (cbTracks.checked) polyline = new L.polyline(fitlatlons, {
            color: 'red'
          }).addTo(map);
          lats.push(loc_y);
          lons.push(loc_x);

          if (cbTracks.checked) {
            polyline_m = new L.polyline([[lats[0], lons[0]], [loc_y, loc_x]], {
              color: 'purple',
              dashArray: '20, 20',
              dashOffset: '0'
            }).addTo(map);
          }

          mTraj = (fitlats[fitlons.length - 1] - fitlats[0]) / (fitlons[fitlons.length - 1] - fitlons[0]);
          mGeo = (lats[0] - loc_y) / (lons[0] - loc_x);
          var lidx = fitlons.length - 1;
          var Velocity = 1 / dt * Math.sqrt(Math.pow(fitlats[lidx] - fitlats[0], 2) + Math.pow(fitlons[lidx] - fitlons[0], 2));
          var dtNew = Math.sqrt(Math.pow(loc_y - fitlats[lidx], 2) + Math.pow(loc_x - fitlons[lidx], 2)) / Velocity;
          var rainTime = Math.max.apply(Math, _toConsumableArray(timestamps)) + dtNew;
          rainTime_f = new Date(rainTime);
        } else if (lons.length == 1) {
          console.log("Using 700mb winds...");
          mTraj = Math.atan((loc_y - lats[0]) / (loc_x - lons[0]));
          mGeo = Math.atan(V / U);

          var _Velocity = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));

          var d_metres = haversine(loc_y, loc_x, lats[0], lons[0]);

          var _dtNew = 1000 * d_metres / _Velocity;

          var delta_x = (lons[0] - loc_x) / 12;
          var gy = lats[0] - delta_x * mGeo;
          var gx = lons[0] - delta_x;
          var delta_y = lats[0] - gy;
          var qx = gx + 2 * delta_x;
          var qy = gy + 2 * delta_y;
          if (cbTracks.checked) polylineModel = new L.polyline([[gy, gx], [qy, qx]], {
            color: 'green'
          }).addTo(map);

          var _rainTime = Math.max.apply(Math, _toConsumableArray(timestamps)) + _dtNew;

          rainTime_f = new Date(_rainTime);
        }

        ;
        var d = haversine(lats[0], lons[0], loc_y, loc_x);
        var adjusted_slope = 0.4 * (17000 / d);
        willRain = Math.abs(mTraj - mGeo) < adjusted_slope ? true : false;

        if (willRain) {
          var rainTimeSlice = rainTime_f.toString().slice(16, 21);
          SetText("This feature is due to arrive at");
          SetRainTime(rainTimeSlice);
        } else {
          SetText('The trajectory doesn\'t affect your location so far.\n\n Move the time slider forward and add another point to increase the accuracy.');
        }

        ;
      }

      ;
    });
    cbTracks.addEventListener("click", function () {
      if (!cbTracks.checked) {
        if (polyline) map.removeLayer(polyline);
        if (polyline_m) map.removeLayer(polyline_m);
        if (polylineModel) map.removeLayer(polylineModel);
      } else {
        if (fitlatlons && lats.length != 0) {
          polyline = new L.polyline(fitlatlons, {
            color: 'red'
          }).addTo(map);
          polyline_m = new L.polyline([[lats[0], lons[0]], [loc_y, loc_x]], {
            color: 'purple',
            dashArray: '20, 20',
            dashOffset: '0'
          }).addTo(map);
        }
      }
    });
    var resetB = document.getElementById('reset-button');
    resetB.addEventListener("click", function () {
      timestamps = [];
      fitlatlons = null;
      latlongs = [];
      lats = [];
      lons = [];
      previous_timestamp = -9999;
      if (polyline) map.removeLayer(polyline);
      if (polyline_m) map.removeLayer(polyline_m);
      if (polylineModel) map.removeLayer(polylineModel);
      var elements = document.getElementsByClassName('css-icon');

      while (elements.length > 0) {
        elements[0].parentNode.removeChild(elements[0]);
      }

      SetText('To begin, first move the slider back in time. \n\nThen, click on a weather feature.');
      rainTimeDIV.innerHTML = "";
    });
  });

  var linearFit = function linearFit(values_x, values_y) {
    var sum_x = 0;
    var sum_y = 0;
    var sum_xy = 0;
    var sum_xx = 0;
    var count = 0;
    var x = 0;
    var y = 0;
    var values_length = values_x.length;

    if (values_length != values_y.length) {
      throw new Error('The parameters values_x and values_y need to have same size!');
    }

    ;

    if (values_length === 0) {
      return [[], []];
    }

    ;

    for (var v = 0; v < values_length; v++) {
      x = values_x[v];
      y = values_y[v];
      sum_x += x;
      sum_y += y;
      sum_xx += x * x;
      sum_xy += x * y;
      count++;
    }

    var m = (count * sum_xy - sum_x * sum_y) / (count * sum_xx - sum_x * sum_x);
    var b = sum_y / count - m * sum_x / count;
    var result_values_x = [];
    var result_values_y = [];

    for (var _v = 0; _v < values_length; _v++) {
      x = values_x[_v];
      y = x * m + b;
      result_values_x.push(x);
      result_values_y.push(y);
    }

    return [result_values_x, result_values_y];
  };

  var getTimestamp = function getTimestamp() {
    var timestamp;
    var secondsElapsed;
    var idx;

    if (document.querySelectorAll("div.timecode.main-timecode").length < 3) {
      timestamp = store.get('timestamp');
    } else {
      if (store.get('overlay') == 'radar') {
        idx = 2;
      } else {
        idx = 3;
      }

      var radarTimeStamp = document.querySelectorAll("div.timecode.main-timecode")[idx].textContent;
      var r = /\d+/g;
      var regextimes = [];
      var m;

      while ((m = r.exec(radarTimeStamp)) != null) {
        regextimes.push(m[0]);
      }

      if (regextimes.length == 4) {
        secondsElapsed = 1000 * (60 * 60 * regextimes[2] + 60 * regextimes[3]);
      } else if (regextimes.length == 3) {
        secondsElapsed = 1000 * 60 * regextimes[2];
      } else {
        console.log('There\'s an issue with the regex timestamp');
      }

      timestamp = Date.now() - secondsElapsed;
    }

    return timestamp;
  };

  var drawArrowHead = function drawArrowHead(fitlatlons) {
    var fidx = fitlatlons.length - 1;
    var theta = Math.atan2(fitlatlons[fidx][0] - fitlatlons[0][0], fitlatlons[fidx][1] - fitlatlons[0][1]) * (180 / Math.PI);
    theta = theta < 0 ? theta * -1 : 360 - theta;
    var arrowIcon = L.divIcon({
      className: 'css-icon',
      html: '<div style="transform: rotate(' + theta + 'deg);  transform-origin: bottom center;" class="arrow-icon">.</div>',
      iconAnchor: [0, 0]
    });
    L.marker([fitlatlons[fidx][0], fitlatlons[fidx][1]], {
      icon: arrowIcon
    }).addTo(map);
  };

  var SetText = function SetText(text) {
    rainTimeDIV.innerHTML = "";
    document.getElementById('comment-box-text').style.opacity = '0';
    window.setTimeout(function () {
      document.getElementById('comment-box-text').textContent = text;
      document.getElementById('comment-box-text').style.opacity = '1';
    }, 500);
  };

  var getDataTimeStamp = function getDataTimeStamp(current_timestamp, h) {
    var i = 0;
    var minDiff = 99999999999;
    var tidx;

    for (i in h) {
      var m = Math.abs(current_timestamp - h[i]);

      if (m < minDiff) {
        minDiff = m;
        tidx = i;
      }

      ;
    }

    ;
    return tidx;
  };

  var haversine = function haversine(lat1, lon1, lat2, lon2) {
    var R = 6378.137;
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000;
  };

  var SetRainTime = function SetRainTime(rainTimeSlice) {
    rainTimeDIV.innerHTML = rainTimeSlice;
  };
});