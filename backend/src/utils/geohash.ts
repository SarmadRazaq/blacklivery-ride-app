const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const NEIGHBORS = {
    right: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
    left: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
    top: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
    bottom: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp']
};

const BORDERS = {
    right: ['bcfguvyz', 'prxz'],
    left: ['0145hjnp', '028b'],
    top: ['prxz', 'bcfguvyz'],
    bottom: ['028b', '0145hjnp']
};

type Direction = 'top' | 'bottom' | 'left' | 'right';

const calculateAdjacent = (hash: string, dir: Direction): string => {
    if (!hash.length) return '';

    const lastChar = hash.charAt(hash.length - 1);
    const type = hash.length % 2 ? 1 : 0;
    let base = hash.substring(0, hash.length - 1);

    if (BORDERS[dir][type].includes(lastChar) && base.length > 0) {
        base = calculateAdjacent(base, dir);
    }

    const neighborIndex = NEIGHBORS[dir][type].indexOf(lastChar);
    const nextChar = neighborIndex >= 0 ? BASE32.charAt(neighborIndex) : lastChar;

    return base + nextChar;
};

export const encodeGeohash = (latitude: number, longitude: number, precision = 7): string => {
    let latMin = -90;
    let latMax = 90;
    let lonMin = -180;
    let lonMax = 180;

    let hash = '';
    let bits = 0;
    let value = 0;
    let evenBit = true;

    while (hash.length < precision) {
        if (evenBit) {
            const mid = (lonMin + lonMax) / 2;
            if (longitude >= mid) {
                value = (value << 1) + 1;
                lonMin = mid;
            } else {
                value = (value << 1) + 0;
                lonMax = mid;
            }
        } else {
            const mid = (latMin + latMax) / 2;
            if (latitude >= mid) {
                value = (value << 1) + 1;
                latMin = mid;
            } else {
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

export const geohashNeighbors = (hash: string): string[] => {
    const normalized = hash.toLowerCase();
    const top = calculateAdjacent(normalized, 'top');
    const bottom = calculateAdjacent(normalized, 'bottom');
    const left = calculateAdjacent(normalized, 'left');
    const right = calculateAdjacent(normalized, 'right');

    const topLeft = calculateAdjacent(left, 'top');
    const topRight = calculateAdjacent(right, 'top');
    const bottomLeft = calculateAdjacent(left, 'bottom');
    const bottomRight = calculateAdjacent(right, 'bottom');

    return [top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight];
};