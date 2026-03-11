"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geohashNeighbors = exports.encodeGeohash = void 0;
var BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
var NEIGHBORS = {
    right: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
    left: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
    top: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
    bottom: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp']
};
var BORDERS = {
    right: ['bcfguvyz', 'prxz'],
    left: ['0145hjnp', '028b'],
    top: ['prxz', 'bcfguvyz'],
    bottom: ['028b', '0145hjnp']
};
var calculateAdjacent = function (hash, dir) {
    if (!hash.length)
        return '';
    var lastChar = hash.charAt(hash.length - 1);
    var type = hash.length % 2 ? 1 : 0;
    var base = hash.substring(0, hash.length - 1);
    if (BORDERS[dir][type].includes(lastChar) && base.length > 0) {
        base = calculateAdjacent(base, dir);
    }
    var neighborIndex = NEIGHBORS[dir][type].indexOf(lastChar);
    var nextChar = neighborIndex >= 0 ? BASE32.charAt(neighborIndex) : lastChar;
    return base + nextChar;
};
var encodeGeohash = function (latitude, longitude, precision) {
    if (precision === void 0) { precision = 7; }
    var latMin = -90;
    var latMax = 90;
    var lonMin = -180;
    var lonMax = 180;
    var hash = '';
    var bits = 0;
    var value = 0;
    var evenBit = true;
    while (hash.length < precision) {
        if (evenBit) {
            var mid = (lonMin + lonMax) / 2;
            if (longitude >= mid) {
                value = (value << 1) + 1;
                lonMin = mid;
            }
            else {
                value = (value << 1) + 0;
                lonMax = mid;
            }
        }
        else {
            var mid = (latMin + latMax) / 2;
            if (latitude >= mid) {
                value = (value << 1) + 1;
                latMin = mid;
            }
            else {
                value = (value << 1) + 0;
                latMax = mid;
            }
        }
        evenBit = !evenBit;
        bits += 1;
        if (bits === 5) {
            hash += BASE32.charAt(value);
            bits = 0;
            value = 0;
        }
    }
    return hash;
};
exports.encodeGeohash = encodeGeohash;
var geohashNeighbors = function (hash) {
    var normalized = hash.toLowerCase();
    var top = calculateAdjacent(normalized, 'top');
    var bottom = calculateAdjacent(normalized, 'bottom');
    var left = calculateAdjacent(normalized, 'left');
    var right = calculateAdjacent(normalized, 'right');
    var topLeft = calculateAdjacent(left, 'top');
    var topRight = calculateAdjacent(right, 'top');
    var bottomLeft = calculateAdjacent(left, 'bottom');
    var bottomRight = calculateAdjacent(right, 'bottom');
    return [top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight];
};
exports.geohashNeighbors = geohashNeighbors;
