(function () {
    'use strict';

    /* MAIN */
    // Just a convenient wrapper around Float32Array, abstracting away that we always use Float32Array
    let Buffer$1 = class Buffer extends Float32Array {
    };

    /* IMPORT */
    /* HELPERS */
    const ALPHABET_86 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()[]{}<>*+-:;=@^_~!';
    const IALPHABET_86 = Object.fromEntries(ALPHABET_86.split('').map((char, i) => [char, i]));
    /* MAIN */
    const Encoder = {
        /* API */
        encode: (buffer, precision) => {
            const uint8 = new Uint8Array(buffer.buffer);
            if (precision === 'f32') {
                let bytes1 = '';
                let bytes2 = '';
                let bytes3 = '';
                let bytes4 = '';
                for (let i = 0, l = uint8.length; i < l; i += 4) {
                    bytes1 += String.fromCharCode(uint8[i + 0]);
                    bytes2 += String.fromCharCode(uint8[i + 1]);
                    bytes3 += String.fromCharCode(uint8[i + 2]);
                    bytes4 += String.fromCharCode(uint8[i + 3]);
                }
                return `4${btoa(`${bytes1}${bytes2}${bytes3}${bytes4}`)}`;
            }
            else if (precision === 'f16') {
                let bytes3 = '';
                let bytes4 = '';
                for (let i = 0, l = uint8.length; i < l; i += 4) {
                    bytes3 += String.fromCharCode(uint8[i + 2]);
                    bytes4 += String.fromCharCode(uint8[i + 3]);
                }
                return `2${btoa(`${bytes3}${bytes4}`)}`;
            }
            else if (precision === 'f8') {
                const max = Math.max(...Array.from(buffer).map(Math.abs));
                const scale = Number((126 / max).toFixed(1));
                if (max > 127 || scale < 1)
                    throw new Error('Unsupported encoding, max value out of range');
                let bytes = '';
                for (let i = 0, l = buffer.length; i < l; i += 1) {
                    bytes += String.fromCharCode(Math.trunc((buffer[i] * scale) + 127));
                }
                return `1${scale}|${btoa(bytes)}`;
            }
            else if (precision === 'f6') {
                const max = Math.max(...Array.from(buffer).map(Math.abs));
                const scale = (max === 0) ? 1 : Number((126 / max).toFixed(1));
                if (max > 127 || scale < 1)
                    throw new Error('Unsupported encoding, max value out of range');
                let bytes = '';
                for (let i = 0, l = buffer.length; i < l; i += 1) {
                    bytes += ALPHABET_86[Math.round(Math.trunc((buffer[i] * scale) + 127) / 3)];
                }
                return `1-${scale}|${bytes}`;
            }
            else {
                throw new Error('Unsupported precision');
            }
        },
        decode: (encoded) => {
            const precision = Number(encoded[0]);
            const separatorIndex = encoded.indexOf('|');
            const isF6 = (encoded[1] === '-');
            const bytesIndex = (separatorIndex >= 0) ? separatorIndex + 1 : 1;
            const bytesEncoded = encoded.slice(bytesIndex);
            const bytes = isF6 ? bytesEncoded : atob(bytesEncoded);
            const bytesChunkLength = bytes.length / precision;
            const buffer = new Buffer$1(bytes.length / precision);
            const uint8 = new Uint8Array(buffer.buffer);
            if (precision === 4) {
                const bytes1 = bytes.slice(bytesChunkLength * 0, bytesChunkLength * 1);
                const bytes2 = bytes.slice(bytesChunkLength * 1, bytesChunkLength * 2);
                const bytes3 = bytes.slice(bytesChunkLength * 2, bytesChunkLength * 3);
                const bytes4 = bytes.slice(bytesChunkLength * 3, bytesChunkLength * 4);
                for (let s = 0, i = 0, l = bytesChunkLength; i < l; s += 4, i += 1) {
                    uint8[s + 0] = bytes1[i].charCodeAt(0);
                    uint8[s + 1] = bytes2[i].charCodeAt(0);
                    uint8[s + 2] = bytes3[i].charCodeAt(0);
                    uint8[s + 3] = bytes4[i].charCodeAt(0);
                }
            }
            else if (precision === 2) {
                const bytes3 = bytes.slice(bytesChunkLength * 0, bytesChunkLength * 1);
                const bytes4 = bytes.slice(bytesChunkLength * 1, bytesChunkLength * 2);
                for (let s = 0, i = 0, l = bytesChunkLength; i < l; s += 4, i += 1) {
                    uint8[s + 0] = 0;
                    uint8[s + 1] = 0;
                    uint8[s + 2] = bytes3[i].charCodeAt(0);
                    uint8[s + 3] = bytes4[i].charCodeAt(0);
                }
            }
            else if (precision === 1 && !isF6) {
                const scale = Number(encoded.slice(1, separatorIndex));
                for (let i = 0, l = bytesChunkLength; i < l; i += 1) {
                    buffer[i] = (bytes[i].charCodeAt(0) - 127) / scale;
                }
            }
            else if (precision === 1 && isF6) {
                const scale = Number(encoded.slice(2, separatorIndex));
                for (let i = 0, l = bytesChunkLength; i < l; i += 1) {
                    buffer[i] = ((IALPHABET_86[bytes[i]] * 3) - 127) / scale;
                }
            }
            else {
                throw new Error('Unsupported precision');
            }
            return buffer;
        }
    };

    /* IMPORT */
    /* MAIN */
    class Abstract {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            this.options = options;
            this.isx = prev?.osx ?? -1;
            this.isy = prev?.osy ?? -1;
            this.isz = prev?.osz ?? -1;
            this.il = this.isx * this.isy * this.isz;
            this.osx = this.isx;
            this.osy = this.isy;
            this.osz = this.isz;
        }
        /* API */
        forward(input, isTraining) {
            throw new Error('Not implemented');
        }
        backward(output) {
            throw new Error('Not implemented');
        }
        getAsOptions(precision) {
            return this.options;
        }
        getParamsAndGrads() {
            return [];
        }
    }

    /* IMPORT */
    /* MAIN */
    class AbstractHidden extends Abstract {
    }

    /* IMPORT */
    /* MAIN */
    class AbstractActivation extends AbstractHidden {
    }

    /* IMPORT */
    /* MAIN */
    class AbstractInput extends Abstract {
    }

    /* IMPORT */
    /* MAIN */
    class AbstractOutput extends Abstract {
    }

    /* MAIN */
    const isBuffer$1 = (value) => {
        return (value instanceof Float32Array);
    };
    const isNumber$1 = (value) => {
        return (typeof value === 'number');
    };
    const isUndefined$1 = (value) => {
        return (typeof value === 'undefined');
    };
    const randn$1 = (mean, stdev) => {
        //URL: https://stackoverflow.com/a/36481059/1420197
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        const rand = (z * stdev + mean);
        return rand;
    };
    const range = (start, end) => {
        const length = end - start;
        return Array.from({ length }, (_, i) => i + start);
    };

    /* IMPORT */
    /* MAIN */
    //TODO: Generalize this to an arbitrary number of dimensions
    let Tensor$1 = class Tensor {
        /* CONSTRUCTOR */
        constructor(sx, sy, sz, value, dvalue) {
            this.sx = sx;
            this.sy = sy;
            this.sz = sz;
            this.length = sx * sy * sz;
            /* INITIALIZING WEIGHTS */
            if (isUndefined$1(value)) { // With normalized random values
                const scale = Math.sqrt(1 / this.length);
                const get = () => randn$1(0, scale);
                this.w = new Buffer$1(this.length).map(get);
            }
            else if (isNumber$1(value)) { // With a fixed value
                this.w = new Buffer$1(this.length);
                if (value !== 0) {
                    this.w.fill(value);
                }
            }
            else if (isBuffer$1(value)) { // With an existing buffer
                this.w = value;
            }
            else { // With an existing array
                this.w = new Buffer$1(value);
            }
            /* INTIALIZING D-WEIGHTS */
            this.dw = dvalue || new Buffer$1(this.length);
        }
        /* WEIGHTS API */
        index(x, y, z) {
            return (((this.sx * y) + x) * this.sz) + z;
        }
        get(x, y, z) {
            return this.w[this.index(x, y, z)];
        }
        set(x, y, z, value) {
            return this.w[this.index(x, y, z)] = value;
        }
        add(x, y, z, value) {
            return this.w[this.index(x, y, z)] += value;
        }
        /* GRADIENT API */
        getGrad(x, y, z) {
            return this.dw[this.index(x, y, z)];
        }
        setGrad(x, y, z, value) {
            return this.dw[this.index(x, y, z)] = value;
        }
        addGrad(x, y, z, value) {
            return this.dw[this.index(x, y, z)] += value;
        }
        /* CLONE API */
        clone() {
            const clone = new Tensor(this.sx, this.sy, this.sz, this.w);
            clone.w = clone.w.slice();
            return clone;
        }
        cloneWithZeros() {
            return new Tensor(this.sx, this.sy, this.sz, 0);
        }
    };

    /* IMPORT */
    /* MAIN */
    class Conv extends AbstractHidden {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.sx = options.sx;
            this.sy = options.sy ?? this.sx;
            this.stride = options.stride;
            this.pad = options.pad;
            this.osx = Math.floor(((this.isx + (this.pad * 2) - this.sx) / this.stride) + 1);
            this.osy = Math.floor(((this.isy + (this.pad * 2) - this.sy) / this.stride) + 1);
            this.osz = options.filters;
            this.bias = options.bias ?? 0;
            this.l1decay = options.l1decay ?? 0;
            this.l2decay = options.l2decay ?? 1;
            this.biased = (this.bias !== -1);
            this.biases = this.biased ? (options._biases ? new Tensor$1(1, 1, this.osz, Encoder.decode(options._biases)) : new Tensor$1(1, 1, this.osz, this.bias)) : new Tensor$1(1, 1, this.osz, 0);
            this.filters = options._filters ? options._filters.map(filter => new Tensor$1(this.sx, this.sy, this.isz, Encoder.decode(filter))) : range(0, this.osz).map(() => new Tensor$1(this.sx, this.sy, this.isz));
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const output = new Tensor$1(this.osx, this.osy, this.osz, 0);
            let V_sx = input.sx;
            let V_sy = input.sy;
            let xy_stride = this.stride;
            for (let d = 0; d < this.osz; d++) {
                let f = this.filters[d];
                let x = -this.pad;
                let y = -this.pad;
                for (let ay = 0; ay < this.osy; y += xy_stride, ay++) { // xy_stride
                    x = -this.pad;
                    for (let ax = 0; ax < this.osx; x += xy_stride, ax++) { // xy_stride
                        // convolve centered at this particular location
                        let a = 0;
                        for (let fy = 0; fy < f.sy; fy++) {
                            let oy = y + fy; // coordinates in the original input array coordinates
                            for (let fx = 0; fx < f.sx; fx++) {
                                let ox = x + fx;
                                if (oy >= 0 && oy < V_sy && ox >= 0 && ox < V_sx) {
                                    for (let fd = 0; fd < f.sz; fd++) {
                                        // avoid function call overhead (x2) for efficiency, compromise modularity :(
                                        a += f.w[((f.sx * fy) + fx) * f.sz + fd] * input.w[((V_sx * oy) + ox) * input.sz + fd];
                                    }
                                }
                            }
                        }
                        a += this.biases.w[d];
                        output.set(ax, ay, d, a);
                    }
                }
            }
            this.ot = output;
            return this.ot;
        }
        backward() {
            const input = this.it;
            const biased = this.biased;
            input.dw = new Buffer$1(input.length);
            let V_sx = input.sx;
            let V_sy = input.sy;
            let xy_stride = this.stride;
            for (let d = 0; d < this.osz; d++) {
                let f = this.filters[d];
                let x = -this.pad;
                let y = -this.pad;
                for (let ay = 0; ay < this.osy; y += xy_stride, ay++) { // xy_stride
                    x = -this.pad;
                    for (let ax = 0; ax < this.osx; x += xy_stride, ax++) { // xy_stride
                        // convolve centered at this particular location
                        let chain_grad = this.ot.getGrad(ax, ay, d); // gradient from above, from chain rule
                        for (let fy = 0; fy < f.sy; fy++) {
                            let oy = y + fy; // coordinates in the original input array coordinates
                            for (let fx = 0; fx < f.sx; fx++) {
                                let ox = x + fx;
                                if (oy >= 0 && oy < V_sy && ox >= 0 && ox < V_sx) {
                                    for (let fd = 0; fd < f.sz; fd++) {
                                        // avoid function call overhead (x2) for efficiency, compromise modularity :(
                                        let ix1 = ((V_sx * oy) + ox) * input.sz + fd;
                                        let ix2 = ((f.sx * fy) + fx) * f.sz + fd;
                                        f.dw[ix2] += input.w[ix1] * chain_grad;
                                        input.dw[ix1] += f.w[ix2] * chain_grad;
                                    }
                                }
                            }
                        }
                        if (biased) {
                            this.biases.dw[d] += chain_grad;
                        }
                    }
                }
            }
        }
        getAsOptions(precision) {
            return {
                ...this.options,
                _biases: this.biased ? Encoder.encode(this.biases.w, precision) : undefined,
                _filters: this.filters.map(filter => Encoder.encode(filter.w, precision))
            };
        }
        getParamsAndGrads() {
            const filters = this.filters.map(filter => ({ params: filter.w, grads: filter.dw, l1decay: this.l1decay, l2decay: this.l2decay }));
            if (!this.biased)
                return filters;
            const biases = { params: this.biases.w, grads: this.biases.dw, l1decay: 0, l2decay: 0 };
            return [...filters, biases];
        }
    }

    /* IMPORT */
    /* MAIN */
    class Dense extends AbstractHidden {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.osx = 1;
            this.osy = 1;
            this.osz = options.filters;
            this.bias = options.bias ?? 0;
            this.l1decay = options.l1decay ?? 0;
            this.l2decay = options.l2decay ?? 1;
            this.biased = (this.bias !== -1);
            this.biases = this.biased ? (options._biases ? new Tensor$1(1, 1, this.osz, Encoder.decode(options._biases)) : new Tensor$1(1, 1, this.osz, this.bias)) : new Tensor$1(1, 1, this.osz, 0);
            this.filters = options._filters ? options._filters.map(filter => new Tensor$1(1, 1, this.il, Encoder.decode(filter))) : range(0, this.osz).map(() => new Tensor$1(1, 1, this.il));
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const output = new Tensor$1(1, 1, this.osz, 0);
            for (let i = 0, l = this.osz; i < l; i++) {
                let a = 0;
                let wi = this.filters[i].w;
                for (let d = 0; d < this.il; d++) {
                    a += input.w[d] * wi[d];
                }
                a += this.biases.w[i];
                output.w[i] = a;
            }
            this.ot = output;
            return this.ot;
        }
        backward() {
            const input = this.it;
            const biased = this.biased;
            input.dw = new Buffer$1(input.length);
            for (let i = 0, l = this.osz; i < l; i++) {
                let tfi = this.filters[i];
                let chain_grad = this.ot.dw[i];
                for (let d = 0; d < this.il; d++) {
                    input.dw[d] += tfi.w[d] * chain_grad;
                    tfi.dw[d] += input.w[d] * chain_grad;
                }
                if (biased) {
                    this.biases.dw[i] += chain_grad;
                }
            }
        }
        getAsOptions(precision) {
            return {
                ...this.options,
                _biases: this.biased ? Encoder.encode(this.biases.w, precision) : undefined,
                _filters: this.filters.map(filter => Encoder.encode(filter.w, precision))
            };
        }
        getParamsAndGrads() {
            const filters = this.filters.map(filter => ({ params: filter.w, grads: filter.dw, l1decay: this.l1decay, l2decay: this.l2decay }));
            if (!this.biased)
                return filters;
            const biases = { params: this.biases.w, grads: this.biases.dw, l1decay: 0, l2decay: 0 };
            return [...filters, biases];
        }
    }

    /* IMPORT */
    /* MAIN */
    class Dropout extends AbstractHidden {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.probability = options.probability ?? 0.5;
            this.dropped = new Buffer$1(this.osx * this.osy * this.osz);
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const output = input.clone();
            if (isTraining) {
                // do dropout
                for (let i = 0; i < input.length; i++) {
                    if (Math.random() < this.probability) { // drop!
                        output.w[i] = 0;
                        this.dropped[i] = 1;
                    }
                    else {
                        this.dropped[i] = 0;
                    }
                }
            }
            else {
                // scale the activations during prediction
                for (let i = 0; i < input.length; i++) {
                    output.w[i] *= this.probability;
                }
            }
            this.ot = output;
            return this.ot; // dummy identity function for now
        }
        backward() {
            const input = this.it;
            const output = this.ot;
            input.dw = new Buffer$1(input.length);
            for (let i = 0, l = input.length; i < l; i++) {
                if (!this.dropped[i]) {
                    input.dw[i] = output.dw[i];
                }
            }
        }
    }

    /* IMPORT */
    /* MAIN */
    class Input extends AbstractInput {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.osx = options.sx;
            this.osy = options.sy;
            this.osz = options.sz;
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            this.ot = input;
            return this.ot;
        }
    }

    /* IMPORT */
    /* MAIN */
    class AbstractActivationElementwise extends AbstractActivation {
        /* API */
        activationForward(x) {
            throw new Error('Unimplemented');
        }
        activationBackward(x, dx) {
            throw new Error('Unimplemented');
        }
        forward(input, isTraining) {
            this.it = input;
            const output = input.clone();
            for (let i = 0, l = input.length; i < l; i++) {
                output.w[i] = this.activationForward(output.w[i]);
            }
            this.ot = output;
            return this.ot;
        }
        backward() {
            const input = this.it;
            const output = this.ot;
            input.dw = new Buffer$1(input.length);
            for (let i = 0, l = input.length; i < l; i++) {
                input.dw[i] = this.activationBackward(output.w[i], output.dw[i]);
            }
        }
    }

    /* IMPORT */
    /* MAIN */
    class LeakyRelu extends AbstractActivationElementwise {
        /* API */
        activationForward(x) {
            return Math.max(.01 * x, x);
        }
        activationBackward(x, dx) {
            return (x <= 0) ? 0 : dx;
        }
    }

    /* IMPORT */
    /* MAIN */
    class Maxout extends AbstractHidden {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.sx = options.sx ?? 2;
            this.osz = Math.floor(this.isz / this.sx);
            this.switches = new Buffer$1(this.osx * this.osy * this.osz);
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const N = this.osz;
            const output = new Tensor$1(this.osx, this.osy, this.osz, 0);
            // optimization branch. If we're operating on 1D arrays we dont have
            // to worry about keeping track of x,y,d coordinates inside
            // input volumes. In convnets we do :(
            if (this.osx === 1 && this.osy === 1) {
                for (let i = 0; i < N; i++) {
                    let ix = i * this.sx; // base index offset
                    let a = input.w[ix];
                    let ai = 0;
                    for (let j = 1; j < this.sx; j++) {
                        let a2 = input.w[ix + j];
                        if (a2 > a) {
                            a = a2;
                            ai = j;
                        }
                    }
                    output.w[i] = a;
                    this.switches[i] = ix + ai;
                }
            }
            else {
                let n = 0; // counter for switches
                for (let x = 0; x < input.sx; x++) {
                    for (let y = 0; y < input.sy; y++) {
                        for (let i = 0; i < N; i++) {
                            let ix = i * this.sx;
                            let a = input.get(x, y, ix);
                            let ai = 0;
                            for (let j = 1; j < this.sx; j++) {
                                let a2 = input.get(x, y, ix + j);
                                if (a2 > a) {
                                    a = a2;
                                    ai = j;
                                }
                            }
                            output.set(x, y, i, a);
                            this.switches[n] = ix + ai;
                            n++;
                        }
                    }
                }
            }
            this.ot = output;
            return this.ot;
        }
        backward() {
            const input = this.it;
            const output = this.ot;
            input.dw = new Buffer$1(input.length);
            // pass the gradient through the appropriate switch
            if (this.osx === 1 && this.osy === 1) {
                for (let i = 0; i < this.osz; i++) {
                    let chain_grad = output.dw[i];
                    input.dw[this.switches[i]] = chain_grad;
                }
            }
            else {
                // bleh okay, lets do this the hard way
                let n = 0; // counter for switches
                for (let x = 0; x < output.sx; x++) {
                    for (let y = 0; y < output.sy; y++) {
                        for (let i = 0; i < this.osz; i++) {
                            let chain_grad = output.getGrad(x, y, i);
                            input.setGrad(x, y, this.switches[n], chain_grad);
                            n++;
                        }
                    }
                }
            }
        }
    }

    /* IMPORT */
    /* MAIN */
    class Pool extends AbstractHidden {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.sx = options.sx;
            this.sy = options.sy ?? this.sx;
            this.stride = options.stride ?? 2;
            this.pad = options.pad ?? 0;
            this.osx = Math.floor(((this.isx + (this.pad * 2) - this.sx) / this.stride) + 1);
            this.osy = Math.floor(((this.isy + (this.pad * 2) - this.sy) / this.stride) + 1);
            this.osz = this.isz;
            this.switchX = new Buffer$1(this.osx * this.osy * this.osz);
            this.switchY = new Buffer$1(this.osx * this.osy * this.osz);
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const output = new Tensor$1(this.osx, this.osy, this.osz, 0);
            let n = 0; // a counter for switches
            for (let d = 0; d < this.osz; d++) {
                let x = -this.pad;
                let y = -this.pad;
                for (let ax = 0; ax < this.osx; x += this.stride, ax++) {
                    y = -this.pad;
                    for (let ay = 0; ay < this.osy; y += this.stride, ay++) {
                        // convolve centered at this particular location
                        let a = -99999; // hopefully small enough ;\
                        let winx = -1, winy = -1;
                        for (let fx = 0; fx < this.sx; fx++) {
                            for (let fy = 0; fy < this.sy; fy++) {
                                let oy = y + fy;
                                let ox = x + fx;
                                if (oy >= 0 && oy < input.sy && ox >= 0 && ox < input.sx) {
                                    let v = input.get(ox, oy, d);
                                    // perform max pooling and store pointers to where
                                    // the max came from. This will speed up backprop
                                    // and can help make nice visualizations in future
                                    if (v > a) {
                                        a = v;
                                        winx = ox;
                                        winy = oy;
                                    }
                                }
                            }
                        }
                        this.switchX[n] = winx;
                        this.switchY[n] = winy;
                        n++;
                        output.set(ax, ay, d, a);
                    }
                }
            }
            this.ot = output;
            return this.ot;
        }
        backward() {
            const input = this.it;
            input.dw = new Buffer$1(input.length);
            let n = 0;
            for (let d = 0; d < this.osz; d++) {
                let x = -this.pad;
                let y = -this.pad;
                for (let ax = 0; ax < this.osx; x += this.stride, ax++) {
                    y = -this.pad;
                    for (let ay = 0; ay < this.osy; y += this.stride, ay++) {
                        let chain_grad = this.ot.getGrad(ax, ay, d);
                        input.addGrad(this.switchX[n], this.switchY[n], d, chain_grad);
                        n++;
                    }
                }
            }
        }
    }

    /* IMPORT */
    /* MAIN */
    class Regression extends AbstractOutput {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.osx = 1;
            this.osy = 1;
            this.osz = this.il;
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            this.ot = input;
            return input;
        }
        backward(output) {
            const input = this.it;
            input.dw = new Buffer$1(input.length);
            let loss = 0;
            for (let i = 0, l = this.osz; i < l; i++) {
                let dy = input.w[i] - output[i];
                input.dw[i] = dy;
                loss += 0.5 * dy * dy;
            }
            return loss;
        }
    }

    /* IMPORT */
    /* MAIN */
    class Relu extends AbstractActivationElementwise {
        /* API */
        activationForward(x) {
            return (x <= 0) ? 0 : x;
        }
        activationBackward(x, dx) {
            return (x <= 0) ? 0 : dx;
        }
    }

    /* IMPORT */
    /* MAIN */
    class Sigmoid extends AbstractActivationElementwise {
        /* API */
        activationForward(x) {
            return 1 / (1 + Math.exp(-x));
        }
        activationBackward(x, dx) {
            return x * (1 - x) * dx;
        }
    }

    /* IMPORT */
    /* MAIN */
    class Softmax extends AbstractOutput {
        /* CONSTRUCTOR */
        constructor(options, prev) {
            super(options, prev);
            this.osx = 1;
            this.osy = 1;
            this.osz = this.il;
        }
        /* API */
        forward(input, isTraining) {
            this.it = input;
            const output = new Tensor$1(1, 1, this.osz, 0);
            // compute max activation
            let as = input.w;
            let amax = input.w[0];
            for (let i = 1, l = this.osz; i < l; i++) {
                if (as[i] > amax)
                    amax = as[i];
            }
            // compute exponentials (carefully to not blow up)
            let es = new Buffer$1(this.osz);
            let esum = 0;
            for (let i = 0, l = this.osz; i < l; i++) {
                let e = Math.exp(as[i] - amax);
                esum += e;
                es[i] = e;
            }
            // normalize and output to sum to one
            for (let i = 0, l = this.osz; i < l; i++) {
                es[i] /= esum;
                output.w[i] = es[i];
            }
            this.es = es;
            this.ot = output;
            return this.ot;
        }
        backward(output) {
            const input = this.it;
            input.dw = new Buffer$1(input.length);
            for (let i = 0, l = this.osz; i < l; i++) {
                const indicator = i === output ? 1 : 0;
                const mul = -(indicator - this.es[i]);
                input.dw[i] = mul;
            }
            // loss is the class negative log likelihood
            return -Math.log(this.es[output]);
        }
    }

    /* IMPORT */
    /* MAIN */
    class Tanh extends AbstractActivationElementwise {
        /* API */
        activationForward(x) {
            return Math.tanh(x);
        }
        activationBackward(x, dx) {
            return (1 - (x ** 2)) * dx;
        }
    }

    /* IMPRT */
    /* MAIN */
    const Layers = {
        /* INPUT */
        Input,
        /* HIDDEN */
        Conv,
        Dense,
        Dropout,
        Pool,
        /* ACTIVATION */
        LeakyRelu,
        Maxout,
        Relu,
        Sigmoid,
        Tanh,
        /* OUTPUT */
        Regression,
        Softmax
    };

    /* IMPORT */
    /* MAIN */
    class NeuralNetwork {
        /* CONSTRUCTOR */
        constructor(options) {
            this.layers = this.resolve(options.layers); //TSC
            this.options = options;
            if (this.layers.length < 2)
                throw new Error('At least one input layer and one output layer are required');
            if (!this.layers.slice(0, 1).every(layer => layer instanceof AbstractInput))
                throw new Error('The first layer must be an input layer');
            if (!this.layers.slice(-1).every(layer => layer instanceof AbstractOutput))
                throw new Error('The last layer must be an output layer');
            if (!this.layers.slice(1, -1).every(layer => layer instanceof AbstractHidden))
                throw new Error('The layers between the first and the last must be hidden layers');
        }
        /* API */
        cost(input, output) {
            this.forward(input, false);
            return this.layers[this.layers.length - 1].backward(output);
        }
        forward(input, isTraining) {
            let result = this.layers[0].forward(input, isTraining);
            for (let i = 1, l = this.layers.length; i < l; i++) {
                result = this.layers[i].forward(result, isTraining);
            }
            return result;
        }
        backward(output) {
            const loss = this.layers[this.layers.length - 1].backward(output);
            for (let i = this.layers.length - 2; i >= 1; i--) {
                this.layers[i].backward(output);
            }
            return loss;
        }
        resolve(layers) {
            const resolveLayer = (layer, prev) => {
                if (layer instanceof Abstract)
                    return layer;
                switch (layer.type) {
                    /* INPUT */
                    case 'input': return new Layers.Input(layer, prev);
                    /* HIDDEN */
                    case 'conv': return new Layers.Conv(layer, prev);
                    case 'dense': return new Layers.Dense(layer, prev);
                    case 'dropout': return new Layers.Dropout(layer, prev);
                    case 'pool': return new Layers.Pool(layer, prev);
                    /* ACTIVATION */
                    case 'leakyrelu': return new Layers.LeakyRelu(layer, prev);
                    case 'maxout': return new Layers.Maxout(layer, prev);
                    case 'relu': return new Layers.Relu(layer, prev);
                    case 'sigmoid': return new Layers.Sigmoid(layer, prev);
                    case 'tanh': return new Layers.Tanh(layer, prev);
                    /* OUTPUT */
                    case 'regression': return new Layers.Regression(layer, prev);
                    case 'softmax': return new Layers.Softmax(layer, prev);
                    /* DEFAULT */
                    default: throw new Error('Unknown layer type');
                }
            };
            let prev;
            return layers.map(layer => {
                return prev = resolveLayer(layer, prev);
            });
        }
        getAsOptions(precision = 'f32') {
            return {
                layers: this.layers.map(layer => layer.getAsOptions(precision))
            }; //TSC
        }
        getParamsAndGrads() {
            return this.layers.flatMap(layer => layer.getParamsAndGrads());
        }
    }

    var langs = ["afr","ara","aze","bel","ben","bul","cat","ces","ckb","cmn","dan","deu","ell","eng","est","eus","fin","fra","hau","heb","hin","hrv","hun","hye","ind","isl","ita","jpn","kat","kaz","kor","lit","mar","mkd","nld","nob","pes","pol","por","ron","run","rus","slk","spa","srp","swe","tgl","tur","ukr","vie"];

    var ngrams = {"unigrams":[" ","ا","a","а","া","е","e","o","ە","我","r","n","α","t","i","u","s","l","k","י","ा","j","m","ա","d","ð","c","い","ა","ы","다","p","त","о","h","g","ی","z","v","ă","b","т","á","q","и","ä","y","ı","н","đ","w","ل","ə","і","ে","с","f","í","و","的","å","ü","ε","x","õ","é","ö","à","ƙ","ה","ह","š","ó","ե","ê","þ","è","の","ი","р","이","ė","े","м","ë","ø","د","ł","ã","î","л","č","ñ","у","â","ş","в","ô","ï","ي","ç","я","র","д","ò","ě","ن","了","æ","ß","ο","ž","ō","œ","ɗ","ו","क","ć","ő","ն"],"bigrams":["e ","ال","n ","а ","ে ","е ","a "," n","ە "," 我","r ","ch","α "," t"," m"," e","ä ","s ","an"," ה","े ","i "," a","ու","ng","ð ","o ","た ","ი ","н ","다 ","u ","ा ","и ","en","er"," ا","ie"," d","ă ","ra","о "," s","es"," с","t ","g "," b"," в"," c"," h"," أ","ən","я "," আ"," н"," l"," j","ی "," 他","de","ei","ι ","th"," k","ar","in"," p","ya","ה "," क","je","k ","մ ","ka","að","re","ない","ა ","ы ","는 ","ai","ी ","то"," i","et","د ","ni","m ","te"," u"," п","to","la"," ј"," v","na","ir","на"," đ","di","ا ","ə ","ра","ি "," т","el","ne"," ب","了 ","ge","ic"," τ","he","ma","at","ta","le","da"," א"," ह","ti","sz"," ե","ak"," þ","on","って","ს "," б","은 ","as"," त"," д","ee","eg","ه "," w","qu","st","ur","ь ","om","l ","је","är","sa"," o","у ","nh","y ","ن ","mə","і ","া "," м","ll","se","م "," 你","or","h ","ς ","ou","d "," z","si","nt","wa"," ל","ं ","li","gy","ան","me"],"trigrams":["ie "," ال","ən ","не "," আম","да ","es "," ne"," دە"," 我们","er ","en "," το"," th","ma ","an ","in "," de"," da","ים "," है","je "," a ","ում"," me","að ","to ","った "," მე","ен "," 톰은","as ","्या"," да","et ","eg ","ست ","nie","de ","te ","ra "," по","om "," es","је ","är ","ng "," bi","ти "," ch"," di"," أن"," mə","ць ","ার "," то"," el"," je"," لە"," 我不"," ha","ich","αι ","the"," ma"," du","än ","re ","da "," את","है ","ti "," az","ւմ ","ang"," að","la ","ている","ის ","ды ","톰은 "," pa","ला ","на "," he","jeg"," می"," po"," qu"," în"," ku"," не"," to","os "," је","ag "," na","ir "," на","ôi ","ek "," من","mən"," па","মি ","та "," la"," se"," ئە"," 我想"," er","ch ","το ","he ","on "," ez","hän","is "," ya","את ","ैं ","ije","em ","ես ","ya ","nn ","no ","ます ","მე "," қа","나는 ","ai "," आह"," се","ik ","det","ید "," ni","eu ","să ","nda","ть "," pr","est","те "," ja"," an","bir"," ві","nh ","die","من ","dir"," я ","আমি","то ","el "," js","وە "," 我們"," en","ein","ου "," yo"," on"," ba"," hä","le ","na ","ות ","ने ","am ","gy "," է ","kan"],"quadgrams":["nie "," من "," mən"," не "," আমি"," да "," la "," se "," ئەو","我不知道"," er ","ich "," το "," the"," on ","zen "," hän"," de "," da "," את "," है "," je "," az ","ում ","ang "," að "," di ","ている "," მე ","мен "," 톰은 "," aš "," आहे"," се "," ik "," jeg"," را "," nie"," que"," să ","a ku"," он "," sa "," est"," је "," jag"," ang"," bir","ого ","tôi ","die "," الم","mən "," гэт","আমি "," на "," el ","sem "," لە "," 我不知","jeg "," ich","ναι ","the "," ma "," ez ","hän ","est ","a da","אני "," मैं","sam "," meg"," ես ","kan "," ég "," il ","ました "," ტომ"," мен"," 나는 "," man","आहे ","ата ","een "," det"," او "," jes"," eu "," nu "," nda"," что","som ","que ","а је","jag ","ng m","bir "," він"," tôi"," ek "," في "," tom","гэта"," আমা"," си "," no ","jsem","ەوە "," 如果你","det ","eine","είνα"," you"," ei ","tzen","aan ","ous "," ya "," אני","में "," sam","nem "," թոմ"," men","inn "," non","っている"," არ ","ның "," 있어 ","yra ","्या ","том "," het","ikke"," به "," się","não ","este","ira ","ать "," som"," es "," ја "," är "," ng ","iyor","він ","ông "]};

    var options = {"layers":[{"type":"input","sx":1,"sy":1,"sz":620},{"type":"dense","filters":120,"bias":0.1,"_biases":"154.6|yJFeZ6rIc4iLuoN/dWiYnKWRU5uFlluhTpann9h4qXPTs9KcmsCFW4OAhvyN1oahz92dj220g7e9kLegbZB7q3StxISGfX15eNRmllK/eXZm1IhnmFqRkNV1gZJ0lceGhMyZkr1W27aEc8bbTa95d3CehKm9m3uh","_filters":["130.6|npSaspqhn3u5jq65k7ahk6+0vXCdja5YoaN0bVU4caiconGadViXz5utX3ygdL+npYpbnLq0lp5+f5ORlqaQn3+JlZ9xdpCkdmBnj21sWaZrwJGlf5+BglmlnYBtjZqnuXaCpYrTlaV/wJOQuIiPmH9/cHGPdY1hgoifsJC2gYaYhq9liqWVgVyxjnmDp6RneJY2cGqLdbR/tH5+b62StnqxlYKn/ayPmW6FlZKYjZ+Bv4GLiK2JZ6iHipmIfYV1nHOPi3d8bmVvhpO1bpBvi6uIZ6OMe2Ggeo6ljpOFkZGPwIKTioOsgYhqiJJ3mJN3hoaec2CPenVplHBxhbNVhGxrYJGJbpiYRIt9ml90dYWPlomvfZGHi3eaiXyISpthZXmFg5d0i8+Qi4yGjZqUi3+RhIZreIZpf4h8enpud4yKUHhzm3ptiaimi256dHFxiJNqUIdpfJNrlYWIkYOneoqIf4CQg2yQd3Nuh3x9fot0g4dqe3ZueoeSkHqXc3Vgn2iXok5VhVeomYObgIiPhqyHkoSAkomDXWVwc4KCfXtpknh/l293dW58lZKeaY92Z3OQeGqLdpaJcn6LiaSAhH2DoIidhn+Oo4Jmhmh5gXp+doqIdpSUf4iVhKaMfIR/pIuDa35vdmtofnpwjnZ8iGl/dXt5mpKhWZd0d2OLdFhXeF2Ca4CMhJ+AhouDkI2ThIGVjHxtjHV3i2x+d3yEep2LaX58eX6Xj65aiHZ8aJZ4aHN7dINzgYaHnIOXhoGkjI+Bfo6TgWB9c2+Nb313fot0holhfnd4eZR9lnqVd4JtlXJtb3mBhmqAhIc=","141.1|d4d3W7phY2HDupB9q2NxeXBplqagf4hkeriOOrsSWpSRc4HNUvxX36VzcTuUQIy3fHDhlWahtXPPW3/FuZqmQVglhDh9nKpFlWpVnIk3tXZOQaRreshvwVmnaGaIXZusg3R6q4bdrm93Foe024ylTX9/fKOhtHxogY+VdJ5xjHuamJSkllp9aWoCqJKnqpFvqqOgVJxnYJKsfI7OY6GuxpFxxIZja8Oqe3mlmoCwnHdzZXSlsXSSToulnYDMkKC9nHavk5lwllFTKJZt6aVot722oW2cpEN1pod/arJ8fGefkYyZfZKmk5Nxj7OjjpyXmpuidrefh2ige1+OjXs5qlyTRKV8cISNTHaxe1RhaniAdZaGdIN2l8OzkQBxn49/qpedlWx4jaWehHaQd2FpioKeqYVUZKSnkKWDlnxXdZmQnG+RinVuf3WYl2GVe8qifpR8W4OKqZSBsI2EWIuHT7CJgcWahmh3onGRhoOXhH93rIyDd4h6dWhugnKubpFfp4Zyd4ZggZqAfXR1f4NcjYR8coiAyY2FdXmIcU6bg5SOf3i6oYFtkH14b21uhpxyolGXqYuPfnaAhY6cc357gHCIb3pVf35vpYhqYJxxg5+Cl7d1eayIe4OFiIVxdIR/vZWDaFSKc0qYg5J0eXiyi7d8i355Ym9wgKtohG2PiGKGaGd0h4qqcn2FgmiHf21uhICklYVnXoVzb46Ej4aCeqSVlXmFinl1cIdulW6ZcaaMbopReXSGipB3ZYOFb4aVSWeAgZmXgmJrh25tfoWRkod2lYukgYV/cmmKZmSlcJdwpol2gZlnhYOLknc=","141.1|hHinhWGse688qaCgtZq6p6a5gLSkzaZemcR+XnpQqMSnro++pDD2MIutgLnTx1M+nH5DXXcBZKKesniydUW0rIPkiKZtq4iznWJ2optgfJ6ttpOefXmONmpeqoyWmV5JtWGBTEyUZ5mAj3mjzXevlICBca2KcmtljW+yqGyemY1llbKBn6mxra39pZmBhahvt6jMbHePnF+Dt6+1oHJxSJm9so2vncWJsY7AY3aebq7ViY6SlpiZop+XurldmnqNbHCbmJ14eGupyJm9mJCghlN2s7Kasm6pro+odqSCdqJvoHaAgYybjJqlqqOzlqCed94+dXKiqHR4jpqEkK/Db6Nuuo+elJ6gQYupgmxzdIN3R3Gjzp+Bi26GmrfhfamuYZx2nm50pTVpd4F2p6qNboOfnIqXdalyoHiIaphXdZyOiXp6nomskq2iV5h5wYGIt3WfUoqvfGd5onN5XnakmG51gZBqio+Oa5SAgIdxrHF7j4qsenxtiMiln6t/lXGjX4Kkf69ZloF7qXhSfHd4dqy1q3aEjXCKk6x4kK1HiW+TX3iJe7h3eWiHeKOuqHmOk31ucp92fqWTh2d7eWeDgHV6mJR8eX/Kb4qcdmGMiIGHbn1xcolcg3abeLGtq3p/iXKKkI53jr5UiHCacHWYjZR7eXaJl6KuqX2UipdwcIKOkWCQjGmAemN7eW14oqKBeYOCdIaNc3yIg3iFcYxmeoqUj358fIKYm8GpepBmdG50iGOsdI+Hbnx9XXl3cn+vrIB7gINrhJOMep+XbodvgXN1jox6fXt1i4yCqH96kGB7W3iUb5GGiJFtfHo=","135.2|YpuClWuJg3VYb5eZapiDhqKuy2iNppltr4RtsqOYiKF/rqCNi0ehTpekWYp+/KvGlohfk4bTboqElIdw87Bui3eH0aWAa5q9VW5thYiymJSLvJaWf5eWXV5oqpp3vWyirnGBjqp/bZyA7ZF1Zo1tt36BfGiXcWprfYfDiHJ9h3VudtSmcaCQi6e7o3CYiYB1koNmlIx9iryWhLKmmZSfWpSnl4eOzaGwsWmgiIaocpyGvIV6n8p0Xayal5OZcZhwjni1g3CNio6JsYWhip6Ri46Of62JoHaho56hh5eQhJV0jYGqh3ywjHSCnIWSo61ynaFTeHeDk46QmoiLfZlwapl/iYyR1J15W6Czppl3XoyGmHaXsLGEenzEeY6HjbVpkXKbnm93nqSIh6Z2ZKqkdXytxndgjJqPjpx3l4RNd52EZIeGc3+Jd3Crmolyi4d4nI19XJxliZ5/j4OCjnmCeHJ4fpSceGiEpZOHoneRjXF5i4KIhoJxf5ltooiEiX2DZnOqkmBjm3i2m4WBhoSVeYiLpnp/kaN6bIlqjX6QeJBxfHuYm4iHhGuBkWqGaaKIcW1xeaCAd36ng4iPgpmDiqB5loaufX2qqnlljX6Qjpp7kXRxeZOBhYSeeWCKkH2Amo17aYNuj2x0fJJ/c3p/gnSAhXSAmm15a4WGe4J0c4VeemeiZYyOg5OBgot5k4SVe4KFi35pfnGHg3x5jIR8e5eAf4CCiIKgcIpyo4JraW9ykX6SeKJ1j4iDi4OQhXp1kZ19fqOYflyNc4uNdXqNiHN7kYFpgYV1gZODnXaRhHNxdnGFeIqHl2mOioU=","139.5|YKKer2fxio3YjZCsvcmdopSzrW6QTJWgg8OOwFu7XKScy6yHbT6oSYLw1orn/Kxo0JJAqDUfbN2q1ZyLuIy2fIWG86aCcHClg52Do7/AXdZZzHrKd2WBOJZb5oVnhnJsq4WAtIqqas6p6qCOTnqxq315gG10M46WaYaD03K+3JekiodSn66Ilq6Vl3Vq676RvqjGpW3YaJBxyqqcYhyOVpfFfZ3YgJGZrH6Un2ujdbKKlYGLldidu6O0ypx5d2c0jYytl5WOcJJcwI7ldY5uh4WQb6+bm1WVn5q8nJqFaa10yKejjINZh5mSl7C5lYd0VLJ6iqigmJNsv2eTlMBNk2dkpYyYi5eML6WogUyedoZuVnPC1sCHiZWgmoxoYKynbXdZkqODsUmRcZR4z323kX2Hh42wd5qOiXp7S2ethqqSp411x3h6o7FiiWhTZmymx4lXP56sYGOImIhzSHi6mj+KgZlvip+ck5a2hXxXo42HhYughniYdpS+sG9xa2Khan+qj3dHmnaZqY10gHVmecCAvYh+f4eJrp6Lj2NefVlhp4GYq7WPdqB5nLjAZJtyXp10hqdteq6Zunhwi3J9hHN8soishYB9dY6hdpuTgpt8XVeNin9nfXagfLx7e4N9dHOHnZOGjzxvflpUjoeNjLGDd5F4obavUnNtXZF3eo+SXFGsj36IimqCeV17n4Cfhn53dYeXboeIVIJ7XWqRhXuUjYR6kXqgqcNim3JngGx3mIZycKqLfXaJcoGUaXuvkZqEf5RyhKeNhYFkdntcaIqMlpGhgXqNdpaCmVN6c2SFcHSXjWZ+l4+IdYU=","128|kXSrb6JzycVZn62vYceeirO8ul2SmqJZw1F/Y1f8dY6aXrR+kb2aPIx/pI9W9pmxg3ihbap2nYR1nHakZ6tjnIGZ1GN4ZINlnGBsY0tgXIFuUId3gkGEi3ZbjoKNWGWVYHSAZYvwmnt0pXSeVYJjb4F9e1+EepZijnnEb5JvloRvjrCicI2PrqqggWx8SnxoYGN/aGyZeXF8ZJF4kqiLUoFjen14vIeHeF2jb461jnFtoYOXlJdun46DkIJVb3tzqXGJb3h4cbRybo6Rko6PjJSUcmyVi0mmj4J4eHp9jn+RiYR/foiSiHCcgXmTiYRrclqqcnZkmnNqgnOLh3TEfpK+eZt5oZ10Rp19zE9+q36MioqIq4h/jXZrca6zopF5cWp0fJZ1iJRyh4KJhJF7eIJtwXmYe5uIbYV4cY6VdWtxh3dzj32HjXaEZY2Vj4B1eJSKU5aDgWFmbnaEiYWKjot7f3yTepN2f5NdlHhyVJJ2YnWGfXmNfXiZeqNwipVzY393ooBZpZSEgH2df4aBg45qeXuBXJ15goiLjpBseW5qmnlcZHV2dY59UJt1mXGGmXpwaYqDcXOdfoNygI5+h5GEkouRe3x8nXifoHyRcYd5b2uRdXSJgIeDhXhzkX98VIp9lImDjIeTenKPkXZpdVV9dYp+bJdvmG+Lk3V1e4eHcl+ghoaAfpF8goWEf4mFfH9shHyRgISHdn97cHuAfGxwV3t7gH1pkoCab4l9fXF1knmPdKB+iXd9hX2Bh4GImYV8f3CQepqOgplyfHlxepB0bHFkfnqFeW97dJReh4V7aXuLfJhrjoCFd4I=","136.9|dZRxp3Kxin89vIaIcXOOmG5wa6mJbImyZqrCaXFKaZ1612yvpXWivo+ucmvqAbe8wpqEeTKddcPAconCgopzamikSqZppKaEtKt/lpppdLFosZiper6Zemyln2WarZyp4Jp/YqH3dKN7Qoyy2Xtzcn1+bqibe22ntHpos3XQkYhhnHtvdJ2IkGuNmJWhqbuZlJa2c3hhb4ieyKenqaJ2q5HAipqsgYWJtt6FcWy4eLm6aY2dmFN0soCUfZKHkp+Fe5J5kcN5d29pj4Scp5CheHCNrsSUfoV5cpyxnY6MZKF4nWqaiZCSf3iAjJaCn4+ZsL1mjHiVl3d4fXGLe7NOh6mAk5Cmo3WtplR8a6OJiI5sgXioeYaIlMiEdpOWPJKhZJitg26LqWVudpt6lJh1cYGXeHyscWZrm3OHr4N9i4WKl3p7cXuSb5qVgpp+io+cpV+jn111l6iOjXpzgHiRfop4gqtpepV5dHCcjIeiinSGhoiVfXxneaZYpHuak3iTmIeWhKieVUyXp4ppiHR8e4u2d3l/lGN7lYNtdIaHhKFoVoh5h5B6eWJ6mliBdIuNb2OLo5WGjo9ue6SQi22GgIR5m4Joen+jZnqkcHBvlHaFoIZ0j4dqhXOTfaC+eXt/mXB6knB2dIl0hqJ1dYp0iot9fHR6lFqBgJqSfYeJhINbm5dcXp+ki2V9eoR9kpd1en+adH6OeHF6kmyEn3h3g46MnH19fXqdYXJ3g4x6dJSNgHmGiFhymIiKanxpfnyJf3V8f4ZsfptqeGyYbYSbd3aMd4iKfn1xeI+FZF+ejnx2jn99gZBzaGuWiIs=","129.8|ZI5xfKx7b4y+ZHFmoHdzhYN3i6OWpnpsc1p2u6r9boaZfXl9o5xjTn6DwHZpiq+DiHDAdU2rp4iOnZRfh5CcYmjkgXWQnZJ1w3Cpalm8poZsqJKEgY2MvJ9vk2CWhHF5fGx8X4qgo4tksY5oUYibgYGCjZ+TgZhugHOQcJhwdZCacKWjkJKQmqW1jpGIXZtzhWmpoJGObn6AdaWKevWSYJN0eJKAeIR/k4eIbm+ilYCOrJByhr2OYZeakI2XkYd8nnancWuNjrRtz5J/d3+AkG6lfoR/lnycmJ6CeHt6b4OZfJ+Rk3eAdo2FmF+gmJSUjX3MeJVsj5WUh3OwgX6PoX2si3t5uXZwiG2heJCWpIhzm5KCiIqSdoxtjKdnmqakr5OLiK53katudJaNd6iUi3yFqoNgf5unmaaEf3queZ1ybouKc3y9g2+Fo4ackpaRgmK6hnWLgIxxfHh3l4p0kICIfo2ThGuYhY5tioOBe5F6k3WKhIiJesCMhIeAe5GLbIaGa9WHf7uagnqMfneLiG6JiIV/hoSHa4t6irOOhXtqpHmVh2uNh4R7sY9wi358jop1dpKFiXCYjoV5epeAeaKEgXuWhX2JoYVmeqeFm5SFeHeSeoqLgHmFh2R+n4J+iomBbGx1i6qVhIFxkHiMeXKBh4F6kI5omIaBlo53fJh7mIhtlIaBeYx7e42HfHuLg3yAiIBtcHeHl4qDe2+We3lwdYOFhXuSil+PfoSVlXB2k3qhgmyEiX16fXpsi4JtfIx/f3iVhF99dZuNk4N6eZR6gXlkgISAfId8c5KLgJWReICMeaF6eIqHeng=","144.9|r1mIzk6ec3hHRWxWsEt9f4KGX61wkWq7iXoywUgzp4dix2ZILAqhEmuScOGxWTM6jVgigdilVJFGwFE8PDiqrZ+mAH6Nppq4cbyEfnm/ToqvxI2ngJdXNINRhJGZ5lFG21F/nU4vVpt+u1pMxXOoq32AjrCSWlqtb4mFrV7CaFNmYpVqnq+ai4/skJScTV2iY3iEpmNgoX6Utox4aIJtOXnHgHmyO1Jzo4CFjplSaKydiFpbcneYWIaOfaOYlpxYZpRseXCPZ2Wry3mKWHNqai1le72IgtqCgoGdWJl1mqJlgnpzWmp7a5Z/oGichLucq5sckFZ9bpVie6KHc7DNa2lbwIhtdZGoy2iUd9ltSmOVlmuKeJRZZF6DlJiTlnN8mJqmiFWRkEuakZFxfpmPcnxqcIZaqZeImpyKrYFQjqd5W4xuYom0ZKWiZGeIomJ0hXSvuFpPcqZ4noaOrXB7r3R0fH1nhWWcWoNnxIeghV6Ng4CJhnhkiKxMipuDd32pWX2firqwVWt1jG5SfIypdH6xuHh9cliHcIZ1hL6qh6ZiXY6jYJuScmCEqU6eqWN3c5dmXlxrgZBjV1qJanV6iYR1gZqQfH2tVohmj22BhoKJnWJkkJFgfI6Ld5adoHt+fGmEa554hcymhKWGX4t+fIiDdGqKmVGrq4ZsmaJqcmpam6VZW1tqcneAhp92gKKDeHuIdIVvlXmHhH+KnHxjiKN+doJ5aIWcXYKhYm9gh2hwY269ilptaINxb4GHkHlvsI59e2ZjhV6HfJCNj4OhfmaQm31rgXduiZaCmpOFcWSKWHNnao2lZWdngHU=","126.7|kXXVYoZuw9JRZdHaj8rQ2sHDyYmHs8B1t5Wxo1pZb66PYN6Zk6zIXLNcmZ1xpqmRWo1xaIJThmCZoXVhp4CNmnWemLCFiXCVcXWDi7OkYGRxa3plgYyAY3txXKZ7Y3WHTqB/XJQBhmOMeHJpYX+NnH+AhIl1enN4wHa0ZodtzbhucZeki6+glZdxsYZtyH53jpCul3CIc7twcqGTjYa7Y7Jsvo5meY64VZqqa4IvhWOhpYZxg42Ie5Gmm5iQgm2nnHyWjKOIcmJwsYVil6CNnLCdo1acp6O5qaRijqt9gmOBZ5KvenZsh4iFjoefmKSEZZ5afqKKqo9venWAiGB3gY99ooyhLqORs4esn3qGkX2DaoVdq6B8cpWahpBYq46IlINpom57nItvgl6Eg3yZdX17hYaAhYSfhpSBYJpqfYSIkod2hnxlj3l5kI5/bJePa6JvpIt7h3CZl3mAaIN1bJF5fX+DhHh5momxkIBplHd9hYSng3uOe3mcZ4R8i4ybcn9okl+hhYuRYoONfYFygWWLknt/gYiEhJKHhnWUgWmVe36MlJKIeJF9hpp+coiHiXt2iWGQg4Cdg3t3hYiAhluAaH57fH6CfYR8hpWFj6KBbHp3e4OEfoBlgoOSfn59eoSDeHeFhGuFgmmld35/hZCEeIZ6eJuCeX2Jgo54fXeAc5uKdH5nhYt4f2+Cbnx9en6AgYF5e4aCgZKBa4B/fomEnoN7fH1zlHR4ioh4enJ+bZWFh4p5gnqFinuSdIJ2g36AgId8gXWAhYeMhH9riHR7ioOQgXqGfXh9i32FinR6coJ2lXmJiHWFeYE=","143|UItlqkyfg6jVtl9CtUhyc21tabKg0oWTsEizfrOpXJesc25ytIKaLZSAjH1pCL7Sg3LTbEJtVImNt5q+R4mxWHSbRFONqXrVl5CtYz17poxYt4uOfY+Oq69diambcmijXlN7UM1ZV4xa+JCvsHauzYB/i7GGsGaJtGl5nGKjVHWkmaaLnciMfmTZpZd8V4iIlFncdZa1YqiDgKaZcYV9RqWEmJaSW2ShZLB1Y2tLZoSGmZyfmkCZrKiZja6ql3m7kISpY3aDj5NempWTrHh6e4uMm22PqLNhn4N7ZYJ3a4dimIGQl5CkiZabs4+nn7acW8ZehZNik3aYkGSzmXiyanq/m4iCLGeNxV6QvIWNmIxwjGd9SpuVmZWilvzFzYGzqp1luGCClEJjeHdtnq+7k4KLkIucqqKdjImKVZechI1pqX+NmXfbn6Gbc4eRunSQZke+tGaCoGV4bnR1lnKZnZ+OgYloiKGKXXA4u4pepWSCkXCRfoWYd7uyc6CLea+UYYJ7nPGmX7SRenNufnaUc4KMxIaCcG2JgIZjdtO7hl+bgIKbV4F6iZt4oamJm2x9b49rgT+ViImDh5ljcGB9eGp1iHCthoCmWYm2m4FvnKuHZqBpiYpufHZwdp5124V/gWyKmn5tc72RhF2RaoiDcWh+iYl4kKiUroyHjZZtfHI/rKBiaphXdGN7foZ2eXqTh3yLaISYeGl6l4GGZ49pgZVxXH6Cc3qdnnmpa4eLm2xzZF+uiFx4nXFwYnleinaDhpyEgW9kiKtub319kodkkGuKiHRgg4WKd5CCno2AgY2YYnpwao2Nbm2XbnU=","132.8|jZRwcrF8lHVCV3JxZ2tzhn1+YWt1VoCyfD2OxKhbmK9tqISQey1+uYuOT32wLIttmJSfkj56qpGVYoBVjYNoYot0I6lsbJehS6y8XanBooqgt4l/ga6SdLGminl5iJl1uX98ln7yp3d31IpcbIVpmoGCcGyPc2ipvoZcf5yBboRia3CabqqQalK/knGXi6uetlWJp49akJ6PiZ20m7mfpY2Sl5l2kXeKqbZfj2zOlZ6gmXpijq1zoIqEhLF9c5tcjZBuZZOPi3aen32IoneWY3m0nqiShkl4YoGWl6OTZoyahKmQfnGbl3N/iZBupJtxppZYjIJbi5OTcpafcIZrd5mimYZzu4a1ZWdzeXupq4dqdZKQbNN8a6vGdPymSImjdnChi3GPrMGHcZCKa5uIcXyxXHqelmptno56qneMi7BsnY6Jc4a6ZmmKmYVsbZuCnHKTamOSgo2YwoNzdYqBb3JyfZWTeJKKdWumg3qfjW2MnHSJiIJshbZSl1qBjHqalm2Gk5ZwX2SPm4mJg3VziISeu3l/fIh4ioxlcbF4ep1qfYiHfHqOhWSEpFZfXIqJYJaMjaqJkHF9kISSiamEdouHiHqlen2EmniPgm1wvmR7mJFwjJCHhHaShm6annp/iIp8j4Vtc2hte6Byc4mEcaSBhnOFlldcWoGGcY+JfYNSmnVcY4GqiqN+eX6HjmGKeICCiX2PjWx2lGV6m31/hZRnrIOFgIOlX3ZihoRxmIqDjHB+flx1f4aIo4OCeYSKVJV7eoeUe5Z5dXKZZ3qbd3OOlHSUgYNyhpB/YnqWh32TkHuJcoBgbGZ7iYg=","141.5|hZefcWKdepxmon6MXoOXkJiutLOTe6hji5toVGLkn6yFhGpoQpSR3JSjxZ2WDcPfoZQXstQAZqdWXnusjLJlnIyJZoh3qaW/jmO2jGFTZKGiw6GJf7F6kcijtqViW6DJarSAys/QZpGBCIufcnFipYB8eK6eh5loUaJeiWp0q7Ftj2gbbKeIumptgpen1JNripKDZ2/Cl9CndmRtgZqNvn13op+HU4CwgZKEq5i1b3t0fWaRbpFuUH+Ih6iam6OetXN3jJR0baabsoydMJxxv/SeW3WlnzqOjZaClbKKm4Nwi7+TbYpOWmxPsHGDm6CbpJuvdKyPc29vk5iCinhUsnQqe395lJGDPFjJyEiziXyUVXCRJmdvjKNwcDojWZVkVZqirqdymLuoj3hznV2aeYFeN3denI1ggnmHo4GTdbKLaXd2s4Z1enR/s2iYbIOJoMJ8TFyLgEyQhZGNTneUpIB1flZad2Cob3R/joaXoJV0lYdoeHikhZtlgm2Kd5d4o1N3k45VS5iihoungotcd5FojXyAhVB5UUmMe4JohpmVpHicm3VydqWEnmR5ZIN5fsOTea6lnYBSg39piIeAjHN6jmtNe4JrT3hSoZd0iXeHnLCPdmqugIyBd4BhUHt+i216YIuAenphg5l9k3ichnp7d5iFnGZrSo5wjnyOapzEmV1OjoiLioKGhV93iHZsen6RdHpniYZ8fYiKmXuceXuGZHt5jIWJaodZiHOGpJNvpq6CdVGKiG+Knoewa36afmR8f31geVGAgHNwa4iXh414l4tzfnuRh5GHcHyedYOcpnaeoE1mYo2HcoQ=","134.7|eoliy13QX4VNiHl3oG1tfXh+jJKIr3Rcd4yomVwXlK973I1qYVHCRpXEj6H8dtuCuW5lm0XHYbeexHeHu2Och2q3Zax5iZvMYGFegsuWW8SVqpXDfrR/VkdrqbqEwmh2vHiDqYA5ZciWwYGEhHaax4F+eIyZb3RipJNqvWrIkJthhoCLkqaTZZe0q4SYs65rm4WmimupkH+T2LOskKGGVq3En6Cvf5Gcla6llGtYb6mupXN/j2+MkICShp6Thpyyh3CVg62GcEeSs4KFnZ2DjVeNsaKgncGeoYejbqSNaoZrqYe8dYGFjY+LgZ2PlIWJqM1bcpmFooRtuo1+dal6fIl3uImZN5zAunaXZK1aln5tkHKewZ50faOVjLl8gaqbe4WesXhytHaXc4NynaO2cH+Zf4WIb3+DlW+Ao62JdJ6DsYF2mIN6cpmVonmFgoeRnIeErHl5eqySnIl1XHSNfZZ0f5pvh42LhojJcH6ZrXh3lYSygHmNhJphk46MhIeqan2amW6hdHeRhnl0gXZyd4Cxl3Z8jHKFmZBuhI+EgJWQZ3qUicWEdZeCj2WjcZGBemZxjmualaSJiISPdn+Bf193dJiZen2rZoeQcXeCj6CBl3J0do19gXaGeJuwiXuAlHKDinlxhoNTf5qofXaAg5+CdoeEj2OmfY19ip5zempzhZ95boOEeHuFdmd6hJmHeH6QdIKKeXSBi3OAlH6FeZV+p4J9joOaaYuGk35yZG6BY5iYiHd6hYx3e4WDb3h9qIt7gYxsg4x8c4eXdYCRgnR3mIGPf3iLhY2AmnOifnJocXZqnX2cgXOCiXk=","128.7|fXGBo2+ganWgkqeabZiYh5GecpeUZ5ami5bJa2f8aJeam5CikWeSrIqWT6+Kk8a+koecZbhfb5r3YH6XwpRsomuDsKuHlIBuWaKKjb1qa5RkjIiaepR7ZYaaoGVqrZOsjGt+Ya5ec5iLq3WReYJuc4CAh5mDfnqeoG+flnaQjXWFhdiIcoqEeIiWtIl6xtWWqY1wbnKPbpt8i5CudkGln5WRnJGiy6e5mbuJbJGBd5mje4yRo6F1n4O7tIHAiXdzdoqTiaN7dK5kuI+PxIp+haiSk5uHpqyIgKCPhJt3k6F6gJmihISTmXSUmbCWpJeOcahzin2Mq3Z1hWyHipRTaHuanX+ksIuRqo2XlLKDaH2Og3mJsLR/jZuxdrmQaYWsmox2nnuKnnBziJp5j4meg3+ueniWfYi1qZeCa2iriJuHkHt6bXl4j4l1i4JljpKIi3x2oJGTl3yHlXqHlnl7dWCAf6KFe5CTlYC/hYFwmHuHkYaafHh9eJKcjW17e2qakniZiWabim6aioBmfIeWe3uWnn5/koh6mZhyf4eihW+Sg4WhlJB1eX96opqNa45/ZIiJlJF5joebnIRpfnZ+iJh8jHiQfX+DjHuYapWCqYmAbpV8i45ne4eKen2bhn9/joJ6j211fX52gHJsfYeHhJx/enx6hJuGdXqBbY6Hf6FQh5WReIdqgnZ8hIx8hnOIgYJ8gnyNcHZ+i4eCb4KChY+Jpnt7eXqKlXJwj4B3fIqAl21/hpCBhHR/cHyHjHxqd4t/gI+Ge5V5d3SRgoFuhoSLiISUfnx9d4J+jlyKf3d9jnqOc2yRjnyEc30=","131.4|gZNwX6pugHm/k3ttoHZoZ3uCbp2PoXdhk1iPlGzCbZiXcaOWZo97P5SM4JdvFi1QjoxZozbaoYd/nI2PkmickJL8MZ9tmnOCvGOvZmGSb4hlYX5zgap5b7NjjZeJZG1WcK2BrXvYoIV4QJSObnibhX+Bb513eJhkWY94aZRbeYCbh4qHkq2YsEjVhpBwWpNtrmR+jHaRcplyaKSla5OLTYljg5Zoj42QjZaSmmnJjnmhbnWIfnmNnml9eopmi2yeuHVVbqaFeZVoiIl+io9rgJygknKJjz2YkWmDkIKBZnCUibSDhIRweo96hm13hpeQYaKcc6BpfId1k2uEjHOesWd4tYR1vIuoVGd+f2amhoNtmI2CZY2ChqenjbCemHaZWI9klKF0rluWcJKJe5h/joGTkoSYk4xQrGeEXZGkdcJxhoR8iHqdlWCIo2uUpIaDjJanW2iRbI2FholwXoaBvJGEgIV0hI+IiGaEeYNndY94kHSFgX2XeYinjIaBbZejZFWBlqJkZIh4hIVwf3Zjg3qMo4aAh22Fcm2Naa5pgmSQpnmDeXqIe5h7bKNonoFygqVxbrWJjGp3eG+QiGd8eJ6Ef4pnhH+YaoSKfnRqeXODZ4iRdn11fXWOhmWNdYCAiHyFkH6CbMtbgmSkkHeEdHZ+fox6dKBYpH9ulJZxaZCKm2hgY3Gkh2uEe2uGgotyhYGEeIOJkYZziXmDan6UeY9tZoB8n3x9mHCThHJzlGlxmJ2ueV93eoqFaIJ/dIN+nnGAfn5zgot3g3mIbIVlf4x2oHpngXyKdnh9aISXc3yUcnyQon9kb2x+i4Q=","132.7|kHiKjK2Cf5K/XIl5ooKlt4J1YWiYbnduaa6YbawAhHCMrXSCU8J1sXOMLoS6VH6siXa8i5uMpna8OXhSKJSfhGZQXWuIap1pf3CUmItwo4aKip+Jen5nnpqYe118pZKhs2R7oKRhpX55XXhdwIucXICAiGqamWluiomJfJiHeGaZbYmFkHFkrKVeinOflq51W528e5RyhJOknYiGXHWQoX6bdpd0elCGjp5tkoh5kIyReWxkgrSNnm6VmICIcZaMY3eEkKB7jkqJxo9ylGlfiIR4g5aPg45Of62FcXV3iXmWgoGBc3GMjI2Xh6mZlJB0lZZsdm6Zjn2ViYaci4JefFmzfqWxZ11fbFWPmI2IV3SJc5CCdoBybJt9jY2Knn6Fj3OVg191hnOXhXaKWYB2i3qLkISXd3S8dLt8lHeUeWmMmnyKgoCPgGtVYmJ2bnd3jEaYcGFin5Z4foeIaIh0eouHfpeTg5J7h4eOoXuOk215eYyTfIdzgIt0gnSFaoaFlIWKgqF1V36PgndsfIV8iXqQeYZ6qH2Hn4aKh3iseo5+b3l1jH2BiW9/mnKAh2J0f4WJfXiBhIJ0g4WQeXZ5iXGHbmxug35wrIafhJR/lYV3j5RxeXxseIWBhm58iYV+ko2CkH2OiGjFeo90bXluioJ/iXeAf2+HgH9nd4WJhWVGh3ZaaYSFd3WEgXSCgWp6hX+AjYGQZ4qFg5R7jIhre3KRk36DfYCMcZd8W26Njo1+a1ltfVdzhI15YoRrdoGCWneCfWOXgZt7jHh/j3uNjHZ7cImXfoN5g36Hl2R4b4qLjINxXIWKZ2+Ii3g=","145.1|SGmwpL2QxsDqe8fNTPzNopvo6V+WgLSvuauLxkGAUteksLCXma7Tq4eil02IzaHKopkpU3TKsJeFnoR30J1QcWMv3opvZmyqTadTmbXISJNMmHqZgYN0VViMp5ZpqZiy0YaAQKHzsJeWyXN8UXpWr318c2R1YIGjbWe1kqCbpYKzgnKcYYuJc7UnjXBo4pKWvqCLqmB8WZxylafHY13VoYeonnSZp8jbrGa3WIDHmKJ2eoqCvpJnfYmiopN7bmU+1I6QlY+OZZFLbo2lobpppbieabmsoVq+jGSjnLZlgJmfqLqNin5gcWSAf7aDnYJuSaBuja+Zi5VfjFxmmayRimVXVp59xqWdNpGWvX56bHyDopSmnZKOgaC3ZE1ZsIdeV29SnYqHsWhjhJ2MYUiXloB5qnKFWZ+VoZ55Q3hPiK6SiY5yhXQ/pYiJm3+JfZp5iaM+S5WphZWOnW2Eoo+ET1+SfIZ7cHhtoZWlgHZRlX+KnY6Ih3VodGa/kZt0aldnkmiilD1Pl3KGmYZ3dYOdjZZxiY+AooR2e3CRjnxweU9mfISQm5OTcGB5brmCl5x3imCKgox9c3yKk4aPjGl6i5+KmYefiX9lcXR8go+MaHp5WIGBi35oeYGeiHlqd4Z+j3h2enWLi3uReVB+hYqjjbGAcXJ1ird/n3R/lWiIb3N/TVqbeYmPi2d6f5iGjXSRjH5zdXd4XZGJVYd5W3mKhIKRmoR5enZ8qZiann9mZ5Jye49CcJqEkIaIZHWmkYWKXJGEfJR1fHeEg5lraXtYeH+KmYipgHl0c4mCj3yFemtmlHV7iWJ8jX+SiYQ=","139.8|L4l74G/ygqnJiHeKa5aQnoWhqK6vvZ1xf1WIvGrpcras0JmWmMPEPI/ZsYnChZnXzIAzekRFctqWqJGEk8RtZWvym5xzpZbaYHGlasW1cNFznZ/RfJqDVJJr3bF6rG+lq2R8bsSdcs59/YiEXYhux36Ec6mXjJhxonaP0nDHoJ+niH26c5CNg7KIspuM26p1oWTHmnHIc7OPuc20ZFrBUcK5oqnPo4S5p5x+dWuXeLqmwo6ClsBzep+jo7CjlYbAz3upbq+Ndapz6KDJsrFvpLe0vq2kv5OXrLSmdbh2a691stDbi4R6nHWYsKe1x8SZfMWaecFpy5B0rneykahQqGtiqZGNeY6FjGG/s5mHbIRvfHirkPaOgarLddhvnbCYW5h/uql40Wl1cJJ4tJHikICkn3t2iJSfrryFc8CzfLhuoIt7oHyyk6mLr3xjYZeInXWLhGlysnCdqnx2inidbbCKgZuceHx+ipXBpYh0zpR6oXK2hXiWfL+ajW2SdJmnZnahhZd/X5S1nXqMfHSPepWU3It8mIx5jrWBjZqOiXSRonqZiKCIepd9k5yheZB2b31wjXmMjJeal5pleIV9hop5nmy2iICIpXd/koyIupKHd6KTe4hmfHaOeqSLyoZ8jox9eYd9jmyUhni9k3qKdrOGe4t9jpqfco17cJxyd4tNgnpjaZxjeX57eYJ5j1qfhXyNiXt7c36HkH6Gc5SgfohzvoV9fn6blI90jHpvjGtwgXCBfmNznm55cn+BhHuHVp+CfImZe3R9e4qgbod1jJN5n3WkfX2JfIuCpmqSdnOGcXiHc36Oa3CSb3k=","136.7|dV+fvZ66mXtmoIWgmpWjynh8baR4bZ6iX6qyklD9WYlqtZl+R6Joz4Sub1mD4zx3np+BdipSmaiUYmGkhY6WR3VJyWaLm5lSpZ+PknKLVqFSOoy2ekxkhJycvWaHyqGCl4t7kXw5lax4QWacQ4aVSX97iaSPnXKbm4KEpY2a54Jnj2qRjHB4lqYrepCW4XGPvpW6gWmiY66RlJyQbUeNtZ+vnpm8WnWEn5JihmdojqGiXGiWl6SKgHyVpY+okJyRXoyYjZiGbbNYWXqujWdzlKWhpK+ApK9glJ6YmHt3Y7CNiKOPZolWnYqNjYOpioqWppFxh7KQhX9llWOwdaBGiGxyeJWGp29biJWvd7mfUGpsgomal6xkkZbEiyVZhH2riJSjfGiInWWMdJqHlmxteYJ2iIaDiHmfooyHqYZ+h6aIfIJxfXWQZplDeG5jgamYlnWnhJCZqW6BdIR0noeFi3t3fpqMg3lql4+Hl4SgiXeFjIOjgnd9dmVUjGpteZSHnpSnaa18i3+Jkohle3WfiJJ4rXh/iY6GlaqIh0CghaOLcoOaqXR8dX16d1Wna4Z7gYGNmIZ8mJSWmJBpinB8eZOBoXdmeX9yoYV0e5mNhpWDm592iodveXOLgoh8mXyAeIaBeYqOi3OrgaB6dYaRhZaBdn12YFifamVyYYiLkptwlHacf4xch2yBeJKFiXx1eIFnh4N5Z4eHcoOEm45/g36Rhn16enlnYY1oi3WKipCLknhyfJyGhXGLYH+BjoNyYnN5goWUgHKBi3JqjYSakXeJkIuRgHqBdWuBplhpdn+FnouPdZaiioOFcYQ=","137.7|aZySfG5tgZlHZqGJtaOVhXusfbadnpu6xIyhwGypcKajo2p8a+5ry4yR1XxqUGmzhIFCquXEcHJR5YRjPX2unXKveU5nrHpC27JpgzO+an1xL4eGfoOLsnahnXCcvZewsmOAt4GXcYJm6Y9pvnewYH98bLKAnZivSZSedHBhlFhkcnhwmomQtYNCb5pzhXeeZYhuo3NrcY95c2R0lmSDs3+ZeWV/km6HuXqYoZrLcp51b3xzfDCWWmqAZJVylW9trJFnhliOd5lvPpSZZGmMmZSAfLiJf22AhWWig4CWopdzgHZSfXZ8aZhfaZeWbXmgW3i9jXCEV5N0j3Zhk5OdkJNcU5xS/V2XQ25Vv6KBeIaZl3aUN3l8dHp3l2VzpWxjSp1ncZOPbVyZj657TF5tcXxEg4hfaIpZdkqKWFh9i32FT4t3aHtjn1tzZnuQtXtvoFSZUXdcjJljdYmPmHZ3i3R1fW1qimJXaYA2eolhaZKKdYGJhndof1u0qZiCippZnmexjJhXcHNto3t6g4ydeYpqkniAfWuKUTmUemt5hWCCi4hwYmyLeWV8Q7B+s1uFgm+Pbbdre3eCVH2TgVKEhbd6lIKueHt5XopsfGV4an2IY5SQj313hIune0t4wnl/fG+FaGqOfcBhhGBnkIx5hGmCeW55XKlzqIV8h2KKa44vkF1xXn2RgWWDhpF6mJicd3+BboRpcI2BcHSEZIN8hI59UIJ9i3tcqIybV3+Mf5xymll9cnNxhIh8XoaEiXtviJp6fF9ohVuAhI10aoVjgY6Oh4Bnf3lxfWiBnoR7gI98kHuOV4+KfWd+iYE=","128.5|cZGCmWqPe29Gd4CQaIOJoIyKhp+QYpCleLFzrmMAZnGZnaVxb2SNWnWdnni3qsCwkZSqm22dbo2ItH11aq1oYIablZNvmHedd6GHmaCsZZVhnICUfXGMeXBxh5eFhniXs4t6o5mabpV1yYl3XoppoH+Dc6B7dHCdkYyEqHGrenZkfIK1bX1/fKeSio9xe4GTpJt9nG56bG94u4CLmLhlYI2rj4WTgH5zlHxwlX+Gc5qGinZ9bdBzqJNxlXVckG98XoyGk3aKcU1jjYqdgnOQf2Vzhpp4immAcKeelIiTfIl0r3eRfHyPjnGZjWV4pHmSZYheiH+Zno9vkmqniqd+b5WigJWqWGyGTnaIi2eIpIV+e3WfoKd5e3J+ctGHbbp3dJJqf2yIiaiLgIR3jZ6QcICScHijhVSJcG6DYIt3hmWPool2l3iulaJpjH97U3iEkVp8WHKkfp2WboOAbnaiWnl1foGbeZeAYI+WXINmn3aIi4iYhnhzeaejlXlyiXqKcY+Qg4ZeeYCvl4iGg394fKOIgXh/kJh5mqxojJBdiGaGY4ZnrXSIeW97d6CgXYOEel92l2+BfJ2Ioo+UipqEem18jnegeoB9rnadj3CKqniDaHBxiW6IgX+ReqaJjXp9jpJ5lZBtjFtFgmaIeoV8iYyBeXx5jKCianeCeIZ2iFubdWNxkouXiJGBf3V7kGiReIB1jnqRjW2Hk2uDaX2Fg16SpIJ6gnuSl6xyhIF/em2JZ4V3dnGFi4yGkoJ5eXuiVJB7foCbfZ+Pco2VcIVrc3OKZ4yQfXp6d4mAinx7gn10cn1viI99dIeOjok=","145|jYZyqJGQna0/bYKbWZlxmpy6i1d4tJq0SJq9XbxEpKFsdZFpSrubznR1snOBQaSLcZWboFxAjnikr2pvc5lejVn8cbOQXI+Eiq+jjXRctHmqboWHh5NxeaCxa4lsfKOSiXCAuqd7knF77nlySYJjkHyBkFiMmJqsf5unu4W5h7pYcIWeaJOQtLG0nmqSsbuijZM6bZxznL2HmKWNiqrMtoaYlqSa5JWfbL2PonRghoyonmRyaM1sZ3ydloWqZZiLypCNjJd2mWWl5HanY496oPGmkIl+m5u3mqKRj5SKeJqInu7EaXeGimuZknmJspNppXmlkKONenCbZ5qNb5OnoX+vhYmMRoGZgE6mt3Cbknl1cIWIeLtueYahb9VBym2Pu2eemKeRq6+hd36GjYHGb3uAmnVpc6S7s7p1on7gibWKS3aPhYdtaa2NunB9foVjc4uOfl1+iGl9jIt7noSjnX9zf2KTdmqOcoqKinibipWNnoabeopth35bhKaCgH97oHSFg2GAXZiqkIOjf3mff62Nw3d6mHp3X2N7jrand5qdsImao3J1i2uFq1qZiXJ/cZuUcUx7pI50fntxgJeCgWOClY2td32ApHRge5p+n455lreUjop7fn2Bf6yYwHt/lYh5amhxhtORd5mPkYyJh2t+jHWHd2Kkm4F1g3eLd2k5qYNTcn9sh52EfpKEin+bdoGAiHlqY3yJj4R5lJSah4eDfHyEZIZtZq+Vb3d2ho5vZWuPf1F6f3KAlIiKioGYkJh5gnKMe1l9dqOZj3qTmZKNm4NjfIR0h3+BoqeRfHuIonlqamyMZG+FdoI=","137|jmmnZ1SMm6Q1bpGBl5Gopp1UvKGRw5ZQkm+wjlGPlI2bdbytPeSVkKR7rzmXsoE+fWL9kjYcXIDCZVxshmGTXWSOoUp4mXJyklmgdT6PWYOVc3pzgnlpoauMfIV8XoRaRox+qW1PXXhhKmZwqoeTc39+ep11iotano9iaGhqjq5fd5TFjWCTmoiQjpBtSLtngXaeimylkYdzdI6ggNqRj5tejHBll6SFaHWJmGtibmtXjltxvpGMeqKJrnZjkGqlh3OseH6DcXmRfopkz4t2mqexm1CLfJqhknFgZF9+aGFpboZrYHm3nYqIc6SSbmuWXXuncpl2goZogY2GjFuQcHu9V4SVRoVsu5aMe3mMk2xtVW1laVBkdYl9ioqjsZC8oZBjdItyhZmZc2NznXpfcX2WtIZ5b5V8hHmFWo2Scnp6kINzkYGRlnmMYnGqxLSefpKArZyLemd+i4l2WHh6jpRzf2+XhIZ4l4BIWINhZox1gHx0gHmcgISmZYGCgIZajJdmdqOoqrhTaHV1fHVfd2NcSHd9gJmEc2yGfJldhGCKpXh6Y0yHdKGCZ6hrloF7vZmEjHuQY3iffHdocn19cmR1ZWhYeH55mYWCb3x/dX2EY5OHcpKLfnVqdoZYcXp+gouDhWaFfZhrhmCKhHGGe2l/d4+De6Ryo4Jzn2qDio2ofZ+YjnZvdXqDe2V2b2Nud32Bh4KHaYR7dYWDaHp4eIN1YH58goN4nGSSfnaMmo2Lf5R2hpqDdHV1coRlbnx7Zmp9fIWNgoh5gY13e4Jme4h0f3lsf3iOgnZ+cIR1eoiUf4yJlH59k4x6cnY=","132.5|YY6OpnOUoYBaoIuZdIKXtpmjoXSMdrF0lKmGbqc2krKAqMmno2GoPZGnhY+5j4K3nnhldkLHdZLBmoyfobxxcZ20fpptdJhYh3akk61voqWOWJmfe72YZJxll2uFn2yTwnh9Z7ahdp1+lImXy4l3YYCEbXOXb212r3SGpHmns2lskKCadpyao4CAm3eWoYt4mJifeJGIjpWSwbXPmFiAUJ+1p5CYh4ONppSTcGmXeqScmZCLrbh4iq2NnqSRepiGeHuIj5x9kWSMfIibso6ZeJucs6iTknKRfqerd6CIaJB6uJifioedlXeLoIae1Ll3pLNXeouRtnuToIigfKtXj5xyspyNbIqmUHabt3iRaolrl3ulpf2GhbW4ebOtWK+VXXegk196tXVvcY14fJtsdYLGjHuFrGd/nYB8m39jepuLnXqKlYCZd5GLkI5leoSRlHORV21wmqaIp3t0eXyVgZZ3f7SXfId2hHuipX2VgnJ7kIaafoZ3hJprnGSejoamZIedjZFeZl+omXtngXSKfZuN0Xx/roF7kqxxfmqDfJRwi36Ml4d7iHWBZ22daZeLbYpvoHJ3g5WQg5SYfHmCgXh7iHiNfH2gpnmQl3d9yX98kntwe5hxhXWYe5CVk3uAsIx6g593flB4fpSBc3qFhaWAh3uDcG6bZ6GPbplzgmNdgmRpX5GTe3l9eXp8j26JfH2hi36FmXWAjXB9jn15fZuIqH+BhYF/caxij4p1jm2Ia3eOdWlzlYt9cHt6e36VdYp6fpKVfoeJd3KSaoCOenh5k4iSfYV8gXCCoVCjjXaMZ4JxepGLc2eRjoA=","150.2|icZ7m1lZfpSysXqar3uSn5OYg1eAM6Rccd1xPLYHZH5sd5JWq36bxGZ0q25oTvHWdaLXp6P5YV6ttLO8XbGmQ4pVUmhuWqGdjF6xsXw4rnJbdZN6fY6ltrmTaZxzfqTAuIR5kLzkYHVq/bWtYIaknICBc1eVkmhhw49Lk2atn5OUmXCCmH9/foZHgmmisYBpjLrDTJVxbZCfqGpolII8qo2ynJyBRGhlmpRkiJGlbJxqbJ2iZ+OQw4N2n45Sap2JM3BoqIpsjFNcOn2yfFyNiZ+IjZ+LkF1QbbKgpH6Qio1pxJeSoY5ui5WYnVqJvm1nqIlwcX6xiGSUhGW1e55XgY2vZ8qgXWBsLFx94V+ytpyLtW2gZsGgm5dNkNV4Rrl8bGmlklpwgb+GipNzXpWAh4KJNonApySKYWx2rYKedFaZ0W6GmHOqaaJLqohrN3mNdkV1PVOjiKefOoSJtnaqWIaIf3eHiKuOQoOKfXijjG53dpShd4Zed5VWk16DfZ+BmZGbhI9KSY6ynY2MhYetdqtyhoaAo4OMnZFVhXlgeqJqe3hK1Vptilh6aFSUMIGAa4KGpE6fkpZUrJ+WkZyFeox3qlS4hX5nqYWxqXWDyop2ootodmKbhYWedpZ6q4KDo4KDoqBihTV8eZ9ndHZrknN3hXZ4eFWfPoCDY4KElzmjhFBLm5aNjZ6Ah595j0Cgg319hYafmWOEll12n4KNeEadlHqEcHuNW7FXgH+SnYKWVHxhb0eKi4mPnIFnkH2jLZ2DgXeTgrWIanl0cXedfGp1RJqTeoJtc3yEpm2LgJOToIdbfX2BXJKRjY4=","141.2|bomKrLaUZX+EWHFyrI6RkF2M0GGS7Gm0dJUxs7aaZZudrUZYvOdysXGUOVeIjGh4j3RTbNFrqowubpRTnVGnbnghZ1OPZGzhNbBPiIyzsIxeqnuagImZtFKOj65psoSHuUN8VltWpYx3/IdfS3Khxn5+iGV2u3amWmuAm5+eoHyIbDJwlId5TrYXjmto8EyZiI+GopZlacJuqox8kEeVpJywbXKma2ugtFFrZZl4la12oZpkYXaQS4OWhp6hcWbCrJKqinWJk5BkpY2cZpWWs2aUbrebq79VqHmhYoaCl6ubh7qmlHJJZ5N7kKKjkaNwV5aMjMaKdJSbamp5ipuysJNQNZeKpoBTxHeYvcFbHouZhJWEWqWRbXOijUhJ3HJZgnBeuH2IlV1pjqOIfkXDgXpViohTiaykfLR2U7VLi7SEdoqMVHhTmpCEo5OKXX1uiW9EtXpVlp6GaXeProx/MqeBe2VmhWN8jZSLqHhew3uIioN/hYdnemywnpiGiJRPmH2gilKvZKFkmXJtf4upjHt9o4J+nmqIa3+PioykfF2UY4GbmoWNjGB6m66KqY2Ge0uJdHOOi4WGaHVwdFuCj5eInWS0g35gWIhJlpiMgZ16YaJ6kH9tf4uQiHxkr4KAkWqGZo2QkIW7el6geYmAh5qBinB3kK2JpoGPi2GDeJw7WKRzYXdvdGV5hp+GjVWdf31/cYRmf5CKjZZ7YJaOg4uLm4OEbnqGn2+nj4uVaIhyjW5MjHVufnlzVnyjlINnP59/fIdghE6TiZNyhXxgpW+QpImXgYVxeI5+lJCLjZBqoHl9Z2KWeWp3eHc=","141.9|oJN9VlJtg3zLiJWgZJRyToWNx62dfpJ4xF2SR8BrloOQdaiLvoqbOrRzrpiCbf3IgW7TZd4eWn6flp6RxJNmroS3xY1ro59sWXmEbGBHtnqVPKJyhoqWcoRdf55qb2OljYV9Ub7sXWZyxZSHpG5qjX6BcKyhZ5t1nG+Jd2JpbrGfgcBsb4aVUjujkJShZYF6im1DWZ1okGmrbnl+f1ZsUIV1eWN139OplIisZJzLaIVjgKGEoA9vsJaDhmqJkZp8n3txd4hxl3aZP5CHxrKFiKGBjI9/kD2Mg2uLd4x+n4hlbVl2noHBenCTgIpohF+Yk3egeYdsrmqhYY9XiX2zWoGpdWSitqePPKdotl51xJCcVG+NeGiahXRYcPzLYpGSj5mZj5x5bYZojnpze5R8kX6olHSoh4xiaVaIlY+OfVh8j26QfIdogXfdc42StnB+nLVQSaO1d1iLaXKPZHGAepSMfWZdd6GJdmdxY4ONSZV6fXxweItohnRwiquNfXtvYop8nzlTsKRwkn6cgYtrc5JqS4R+XH95c3xsarBWiJJqnXhvU1lyimCEQGtvgZOAkn9vka9/aniPh4qCf3Z+fnt2imuig4CkQ3yomWlygoGGk2WUf32dfIyHd3hvbYR+d2h5nXlraIFPgpGNlHuFe1J7jnSDYXBohJKJiXFwhZPJelumpouWf4h7h3h4j2aKhX6PaHublnFxlmWGkXCEe3xuXnuEfoVqdImSloZ1eGqQnJWQcqiRhoF+lXt8b3iTkpCCgZtZeqt2cn2OZ4aOcI5/anNTf4VxgG+HZZqHgniBaoiYmk9lnJqJgno=","138.7|mZtlSlVScZTAcm5rom5NKWeBqKV5VWteo1NMpK1yb26GNmpLcneYLmlly39GtPzgaGR7ns3zWWJvtpZstX6eUGRFxid0nWKfbWJzZFajpWlmbWxSfXSBcn1OXK6EFmGsKmZ7raTUX2ly0ZdzT26dqH96dKFmb49jlIpaRWZbemibeI5bkV1VVpZAcZBjSGJtbWa1mZWUdTxjVXR4bEZJSH1DaWVJBnl4SkCRl5eMa0YvZHx8kC2Ql2N2eW1wkWBrcHSGbGaKj3BpEHpol4hwdGR6bC6QjDpdbFhTZYaFl0NokWtyi3tnd4+BW2uSa06RXHaOcYdqdI6Wh211f1F2X2h3Y2hXUH1eXpt1rCdxtYaUqm9riXyHeYdIjZF0VoZ3ZZFdg5R0c2qTkGZycnKAjX59boeVYn1nSkiDWoeRdl93uYeMmXuEi2eEfmx3g36NWHtdaJ2Ic4V/UomPc3WKdGiHfn5fh5xVcI1eboViao51aHmJgYiVfXKeY35vb4hzXolQhK5tnoZwXnSZgopjdHFNa4V+ZICGj3F2h2xohWJmeHVlbm+JiZp6R5xhU5B0c2puh2p+WmRtk4+Kb3WBeXV3dl6khn2GQ4emim6JfIyEZWOOdm6RfoxreXNQooOBb2mCm3NtikR6g2V4jXZ0eHWCiI56d55nXHBvd4FviV6pV22nmIyXdYJ+hXR6bmCMg39yboGWZHeHUG2GZnqMd2Nub3+EiX9+mHB+k3d4hGmEbo5neaiJj4h0lIJxe3iJWJKBfIxfg6l+c4peeYRodH54Y3aIf4SMdn15ZIF4dnd/aYNsjXlhnJKKhXY=","133.3|hHqIp6PCpYB7WHqGWoF2fJKHjVt4SYGqdLZsr1F4k3VspsSmq4phcImenlq8NGlJlYb8YzMqnZ2ikIVSO3dfRH44UF2GYpJmeaWSm3uuWZ2XUomofmWOl6hunHtwk35Vg4J7UWc0naSCh35diohicX98hFyLhXuihnFvqZWseY2GbWSYa3GDb1NolGqTioyWqaGmmmm4jpKOrnWoi2eXcHSdnYioeJaKfXh9Y2hQkYlraZJneaNsnISDn3GfbZVkkI+AmYiMb3KXPHuPom6QfKqPe3yOg8Foe3qDiZt+Z4iUk5pqi3Z2k2uViJ9+hoZronaBiq2bcpBonI+UdZJzi5LHbKF/P3aGo3OMboqUq4RtYY6JXJiIboizb4d4iHF8uWqZfW+JeKxpcW+JrnRtgHt+XHabj5ObZ596oW6YiIOMxIx1noWJbKJgbZB5T3h8jHtlnXC2gXKNrHF1boiManyBfIOXd5iFb2qBg3uXd3yHk4xqhneQgmdce292iX57eYCFf3yWdJp7eYOYf3R6hoxuioJ+ipF2m32CcX1+eJlvi4Ohmm6LdpaAcV2pcXWHg4x6k2p+c51imn5tgpyAdmuEe3eHgH9BpnaQfJlze4J4loV6jI+UgnR3hqRUeIB/eY94ln6HcUajd5pue4mWiaSAc4SFZ16oZ3aOdn95i3yfY5Fpkn1jhJx5eG6EfliLgIFzjHqSg4J0aYB6lX57gISQhIJ7e4RyZ5hpc4qIknWJc31dg2eKdnWDnHp1d4WFT4KAfW+Ue59yhXZhg3qTg3iMho2XgnqJhW6AooVpiIaNgot9fXqbdYp7coU=","141.5|k39ohoF7gYYxVXx3p4GCVHOfWVl3ioxSmTa8r0q8lIWGp1tki/ujynKIYpaTP1bPmJqtedF8g5ZxV3lSFbKjgXd6RZBuYV55VFeSWKeuUImaMmiHg22KuoCpiZ54tJ+8vod6d6jUfYVwz3pYjYqhgn+BdF9mr4BetoaJgX18YF9eb1r8lGR6P2k9c25fgIJnUlRNn2hSkmpdi2BqpKWMtXqKm3yFtFl4wak+eJjBfqKDhn5hlmGRj3xTVo1ZbmOwdXBYZJiIbaGYS3p+r3WYiamGlrOFi4CFaGGXlXSJmKB7an6GeXK6lJOGeo1qpGhpWGORcV1YnJJlYJNugJCgYZy0c7dn3HGbrWZUrM2Li3+Vh3+HTH96aXpwk9Cut2VhaWxbiXNzbql4jKN/fH2IbH6Ig4iNkUaKi412WqOmdD5qrIpwR4R9jnl+ZpSZjZtRlV98pGRrnZqtZ3uMmYBvTspyfV6hhYZ+VHaMeXtlhoJ0c3KghXlpg3WgmHx7j6GEnneOi2Gda413mYeIg4mKfXSFYnd/eZOIfIxqeKOIeWCFfHZHVFqLdGKAap9qklmJeWaSe56XlG98f42Fi36Cf6yBiHyieHxgoYiClFR6sXZ8YqF8c3N8hImPgHCOo3h8bZCGgnl0e6SQeWGvgXpccXiCdXCGXaBmrHmQioGNgahkhpVgb4qKioJ8hZJ8ileIdXx2iYOAnG5/s296aI18dmxmtIJ6eoNqmFSXU4uSf5l7mmtph11zjoOIdX9miYJnNZF5fViZgnx5dISYeXxng31zXWyafndyhml3WpRtipR2i3qTbn5ybWmGhIs=","137.9|d6Bjn7uFd5G+WnV9uah1cI7EcWGGgKC0hoT9yV7Fob55b5lL3U/UxG5+dYwf54m4jI9fak6rr4XYqqpZ+Ziwi39tz7iMYpx0R69ShNbHYIerOJSSfJ6qTE+cj6dujZmrfHyFTKWdrYik3Z5hV3uuin5+i16XcnusxGuaj6CQwISXa4SEnKagbK9odGye57efk4NzomqFnHedYoaFjS6Fsol8zY+Lx7GGfcOhZHCIl4ikc7RqrXWXsI6cpaqHa6KfVJCRgcaSbaiidYGUl5aWlq+XnZScnYazoluIjYSGcZigjJjLqHNvnJeRmKqbq2Fpqq1ejpGEnZVre5pwfIV/a5SCoK5zkKXGfJqbvI1yhphxrZWL2rKgcKp4mbGhlo+LgWuntXaMok9fd5GRdXyqjH6ZhompfXnAp2x4rpC/iX6AtI9zgYZCcI2GoJNmmp1pZ6RXf5ikeHOSa3N1uI+MeoiIfqdriZeeiZTacnagln2IdYHEhXh3hmRYgn6AiIWbnomGoDB7l4uFiYJbg3ani42Pl4Z9e4SKrK1skV19eKGdeoeGh6mKdnSFf1t9ZqiFcHWNf2SRoXaUqY11g1uDeo+JlpqogH2XXoyngJGNorF5o4N9jnJjg3iHin+0joN8d3CHl4lqjYlpe5+jgYt4gpWCeICIY12CfoiOcYuMeneken2ekpFzgGB5fqCKfpaRgXyIcoaUem6Jfod6nXyHhm59ooV8codoZX+CpIxwZph0dJd2gJ2KknaFXXqPlYV+kJSAfqNrg6KUcYWIiXudhHSOd32dgHx5iWmChlmYh2xpknJ1l2eGk4+SeH8=","129.6|oW/ff51hq8hAo7bMoOHn28a812Vpxspby2K0XaIqbL5kY8rDmfyvXc9lg694d891e4q8XMTGl3iXfHGmWISbtH2ybrODZ4SDb16Hb7xen3hrinxzgIyEkYF0XnpxaHd2kHmAT3j4lm+NyGufoIOcin+AgWN/i5Bjq3G1iZKZvsFhkG2skMLGh5uSxnCI399qkWyzao9TcKqFg6Wkk2uqarp7opN04oS6gayLY5KtjYuivISUjZqPhculobCmcoqqqXCscY92i2Jq2293upmUqJaZnoWoo2KqrJ6GjZl7lIKRjaaqeIumiI6Kp9S+rK5umJWndqFvsm+RaG6IcYaWkJWclpufcpOPh2ufn32Gf3yNmIuEi8V8kICjjaygtqWPoW+ToZ93l3ZrioWHfXykb4GCp4WBh6Gke595nY+eeI93k3iGcn5yaY2LdpCCf3aNcHZohHCRj5iToXWIl4aGbJd1gnyNhXyci4aokHuWmo12mXiUeoZpeZhYg3yHjIeTcJJ0mF+Eca1tioZ0fYeGhoKXm3h/jIGGhZWLh5mOepaSonqTY5N0h2Z8l1twpm+LlHx4immAhn2Uh3WPgXeAi4OFf4GheH9wjoZ5f5F/oZJ8lY2MdIhvgImFhJOJkHl+goWEe3uIhXyBepWHinaUeZ18hXZ5hF19mYePhoR5f2JfaYFpe3aYg3h5go2GgHGPen+IgIB6fouDkY97k36Deoh0onyCenuAY3OUaYmIeHmBZGJ4f2iAdoiEa3mRiIOJd5B5gHGKg3uGg4uQgHuUhIpzlXKWgIRyeoN9X3yCjIZ9b4JrZnFsdHp0iIE=","130.5|inxRe5OMVle5nV5kW1NciWJMWluQmXCaYb+IapxudmCIjXJ7nIp0VIGH336bLZ5qiW6MZjTbkYaf9IqgNn5dbXv8XnuJY5GwxZaWoGlolYtyupCDe3mBlJJvf5ySiW9nbG1+VYQ1kY9t0oOZtoJgrn+BiV+SgXuTc29WZYxvbnubi4B9aZV7i2Ggf2yPepaObKSqbI6MeYmThYltcKBcYZZxcpZvZVJadJpmZ2leiW2IrpCSZI5siIZ8g4SEb4yrUIeKl3R7imxzqopYRWB1eV9vjWtyb5pojKdwbGF0aWCJd1qPjImCgG2EgHWFhn9pjZSDiHGje3SNlnWUgm1DiHOBnIGhcF6Hr2VvSJuBgIFtl4hyZpKLjXZgbrFziY2XgG2NbIeFe3xqdH2Gb66ki39+cniBkVxycW14jpashWGRg3qJdX+wf15kbISDe2mYd0CypmhXdaJ8Ynd0YIVllpqJf4V8eYeBbHBndnqIln+Heo2MfIOSfKl1fHN7eJSSboV1e7+eVYWcandzfXNng1OPl4V+hXZ1i4d2dH2deoiMi4R1k4V4hph+pXZna219cI10iYSFgnaFfYSQdnx6d3WDYneghX6Vi3mEcXt0iJ15hnF9h3yHfHVwgV2KpIF9inh5iH99dIBse4mHgIZsjGV8hYd9lnViZ32CfI94iIddm5pgeIOJeHR7d22DcYSVgoN8fnqFhXp5lnp7hXt6gnOTeXyClX6ceVRmbYKGj3CFgHCmiF93fIZ3cnlodIJcjZOCgm+AeoNtemKNj3qHfXmHbY1sfoKJepKAdWV4fIeLaIN3dpiDbXSBiH0=","130.1|mJ3FTVNczK6ldJqkmbrUzaWailyVhqugl0eqolNrg56adoeoi5V2x454DEB52p+ufXDtlViRWXN3HpdwWaWXU5ABnFOLXoJST6BOYZCiWXJ8doZggU6Qq0mhc1aIZZSkhnB9kYTSXmh/LJl1bYGWVH5/iVuDnGuatILAYGRamGWSeXWNjp6bfqCDomt7sJ+Rk110lmhXhId6b5exfb2Ss39vnIpepmeEkIp3infCa3+Tg4t1mnWMmauarJWlbXaCk4mgZoqHbnR8do97yp58l3icdIKZiDOBd3yBbJaHc3JodYyLkHqoi4uqlr+dl5VndYl4i5JhtItpanuth3LNcHu9TpaTxYqNUJCRrWxZj4p6d2x2qYqLdZ6oiWS2h4qRq2t2kF+ImZuGeIx0ZnNuh3+ImoOTjqPFiYN3b25wh5BvlYhzan6CjV2SXnyIgppzjIl0XYeEmJB6qoF+a3R6WXODgZCDhJWCfY6KhHpwlnGFg3Jzg3dtgHCai5x7foFhmqSAmHxji219iHmRhXptdXONeYB9aISEn66Ai5Ctem+TTYaRV4qJdG2Ah5lbh3N8gFOPlLGEhWiRhZSSeYiCepZ0f5VcgoBxhISgp42NlYB7cI1yiZKOgH2PeGV7aoKBZICEkZqDiH1+enJpcId+c5uBdnZ/e5lWhXZ6g22NjIxibGqPbZKleIiCfnZ4iYVmg392fYORjX+Fe4Z4coBsg45ukYR6jIF1k2uUd3yTZ5mIl3BYeJF5jol6jYCSd3p9Z22BgHiFgpyVgZF3i3pxfneJjm2agHl3e3Z7YZ5lfo5qk32Nc5JahHOPino=","137|sWCyTK5Cta03rdXAmc+rhbnBdFNwb55MuLnKR0zKlYZmTKCzl3DJv39W8qowpiVEWXE4VKZcpFjopWa0kVKVv5X9tYZ2WpNSr1Gtl15HVFKXQIVUfWl8QrulZ3l3X5VmdJiARGvTpFB3L2KltHGUWIB/elWKX5pYqGuiVpVRr4Vel9RrjIOa5VS7fmmSb8dfcZ9fXWpUkHuQU3R4llKCr39bh4RpvKV0j6y0W4q4lXeaX4SasmiIqmSarXtAapZWbm5hlMFubKqUh3KHjYiUhKWXmoCDcEewfmh6cW15hYiXbIBucouRjYiUgpSJfWljqYuRb1+dkWtkUo54bXKagphwl5KZ1ZuwU6lgoGyWeHmIeZB0kFd3mZJHib/KYVTDTmaidJxxik5mhZCKaIVvcIKUg4KfjoFmo253rHblc3WNgXJxX4J9Y3F/XpB67KmNdZmcXKJ7Z3h+bHSCo4p0xnF0f4djhZiTgXGCf3agX5J0YYmNd3Zogm9QfpB3j4GHm3h9iolhqW9eiH1re4KOi4F+Xnh9fnWEf4WMdJFdeJ5yqXhQemdvdGKDbFVuloKNh7iNa5eBimqSfGJ2e2J/fKeFjoBjeYGnXIKddW18hmp5noGYbnVsfoCJhGmXbnp+dnGAlYSDdNGIdaOQlHNniVR6c3OFZFZkk3aPgYGNd5ahqmSnimOCeWp3gZiGgYtzeH54cYOWi4R4dIN2mnqDeXWKY3p6dYBwXHOMg45loZx3mY+Xd6iCanp6ZHh1kIN4m218gIdkgaJ7gHOFfXqcdJByZotofHdxg3F9bG12i2uci4OUkWVsmYNren8=","134.3|kXVo0FO6b2FCpoWBoWBsalxdaZeNX3NbdWGUUl0yiF2WxnhfRH6GPoizjJnMpILAqZpknJ78WaR7gmeqtpScY2pUrn6LkWyki1+Ab4tSYLJ/gne/eHRsZ3pfoKiX0W6br7R8tJkXXMF/KXOeRoSckX59i5dzcGZjkZF5rmK2kHhjkZ6gjmlgX2w6eIpshkppgm+9YG6khn1wvJ54fqaBTZmvkYOtE2R9i3Vtno5GaJB4aV+YnGaNaXCEaXSVi2yTSm+NcI10blSCUIV/hId4f3OQoJltg8V3f5iTnIKDiIRon2CXZYlyhZF/dU6Ib4OMXI5QcXlvfm1suH+LiqY1dHliknRwQ3tgpZ2QPbaVanOKom6dnGNpk4BtjiQ6f4iTjoxggVx0in2Zh4BxiYh+c4GNkYZxemF8koeEWJZfd251gnN4kH6Tko10jXB9eaqcjISVm6Jwkq2RW4eJbnSBf45wgpiIhWtnkXqLloNlgnJ3aHaOeHWOgYCnjHJ/fouYY4+UWaqTmG2XfYh2f4h9dH5xaXd/fZGHjZhxd0OfgmFuYHh7kIxydZeAjKaoWp57enBwj2OKeZ2Mjo+UjYp8gG94dHtcen+HfoRtaY2CdJyDZWNscoKDfIaBeI5/c3p/goiEamx5eFSqgmKQb3lpdYN8dIiCe6OmZn5yd5BykWaieoypj457i32DgnN5fIFqeoB9iINuand8bYGAZn6BeXR+jnp6jYGNnJBmpHV4gGiJYqx9haiAi4uJeIRzdnl3c257gJiGgmVtfmVxl4Jmf213ZHySfHiJfn57mXB/e3J6b4Noq5+imYWKioc=","129.1|r46viK2Sv5xRbbC4pruoua3DpXeJkK2vsqKnX66knrKTja26i3qPtJ2XhoCOm2qWmo5qiFcBpJq4n4JumKmhpIu/vbCKdm1jkap2knZeqJWjcHeTf4GNTWuanmGEfpKVlnKCgI/ao4uFuoRxtYSiaoCBh3ZzYoGotIHfmJmKr5prdsuAlKWvxV7Ql3dppb6bjpOAZJR7lLZzi52umnbHpZCPo5WV9q+hlp2uf3CxlJCoroF0vo6Scq2zraWsdmdnrI6bkI52k5Ces4WglI2Rj56khZiTnFWzn5eRj6GIcpiYiJWVgHmuj4+Cq6Chqbh5W455i4SSqHCYcJWfjpJ2d5eBkZGVqp68RaGgnl2DcYd1VZGYma6AeJWwkIqqlImWnXhgiH6KmoR6eIaKkZ6Qdn+ProhzkqacuLl9WICIipyLWniOhIaDmYyTZ4tzwZ+Pl4ynUJZ+i2FssH11gYiMmXx3f5qOhm2eonKFuXxha4KKg4iOeoZxhI2niIiCjHuEkHKGl3JYmoCZlIR/gnp/iZyYrXp9iYuHbZKJdIicfWBqlImofoh0iWyFnaaMlIeHi4GMfJV4jIemeIBuh4WAiIOGlqGZen+Um4Z4gZx6jJV9ZYGFjZltgnqLhomZjnp9hoaEbnmHcqWvfWB7g4mIh3Z8iniEe6WFgoCLfX+Jdo1mm12Ya4KChoWAfIKDjKKRen+DiIFtg4h1fpV+Y3pzhKCIa32CdIN8nZVwg4ZscZJ0l2eYdpl5hHaHdX+UfoKSro59fouQgmh/hm+PhHxmgY2NkIRmfoV0iHeAdm19hm55jnqUZ5BzknWLdoQ=","147.4|s65vpErgQpokdlBrwHx5PoiWek1ZknTCfjNvSW+UsYdS0V5JeaWYM16+csjqeW5Ys6K3rf0JT7hgWIZ/YGu2jpqnOcWbVYKTWLm6WtNJara7aXKtg4ygxatktotrlm9jkIh9tmlCVrB/8p11RXW0kHyAlk18pIq1hZWcoVype5ZRcUGooKypNqJzh2WJq2mkgUt9YXLHpUaGuWxBrnd+QoetknWikXR6j7FpoqpmYp2fk3Z1VnCdfrNpeKOFZ5CQZJKIXYZ0cXy03GWYZI+bkWF3fISCgb9+lGiJpG2jqoVil6Srh3pvUZ2esWmerHldoVSolYdWqGx1pKaOaYrZoqmemYtqQYJnzWSlnJSsooykWWuFeIx+fFM8ne2Zs4N2r2OZpJKSc2uUk3Jvs3CtaoGHeIqAwXvMd710qZTBjGJlpXZ7oIuYXZqkqIWWXmxam2RYvly6dXC9TIiXYXCPWrNxfVRlim/OZI2rnXWgm4eQj2mSeXiZiKhFe42HjpekX56JcmKwZNNdgotxiJRwdHGGbXV+dmOKe8Rsi9KLeaFwhI59ZXBweKWFtUqTmnONbIFuanaDopN2n2NmlG6KeWhyf261dX97W4hYnJaFyJF6nYOIk2t4hpJ3cKJ7nXp+dWuJb6JrjJXJe5yjho2IapN6eoqMdkuUrYeLjZFsgoupeatUpWlei3yFiWl1gkKUdn9/bIdutm6JwIZ4nIebilxmzXt/e4d3WIOpeoWWkGNxeXZxileLanSPcoNycXiAMpp5gG1phWOSbp+ll3iejnmSYm6ne3uRioCAoKWOiJWGa3mIcViRYpdrcpE=","137.1|ZYSHkGKiiZxql3typ3uGhImMmqeLtZVuqVeyWGDLk6F9q6ahXOKWSa+k/H+dLJzGmHCdkz8zZqCSrnecZKGja3XAeFNvn52Uwm+ha0ZeYZiRZZmcfpR6krhor6qPq3KhoI99mr54Zp9rTICTsHqgkX58c6SYkZlygpF7jWt+iaV1ipGSlJiarWmkmZSaZKp2nGTMaXGSj42Xg6mpgYyEVqCUlKKcc4uno5ydjW2ibpqDbGyJpV+TjpKXk5iOkZrCv3iObpxxbp6Ta4aYtJZ4oraeqZmTuXuLsoSRb5mCaJduf56Gc4WVkZKBo5mgl5KYp72udb9qj3FrkoqcepeUj3WOmY57xXCPZGeio42Uon9uYnGPT4Z0hquJkIiasZ+qd5aeppx8mV6XcpBzg5OHd4CIooiIg6txhGiGoZumeZZxoXd1fYGscnqTdnObtZGgoHuxam6mk2+BkIdybXeDsqR6fod1iImEe3JagIeYipZ8kXSZeXh+hZ1kkpGJeaOUanWeic9sdMKCj3l+gHN9eIZ6knx/gHqKcmuNc5lmhpidrnqUZHZ6eH2BXGWRqHF6oJ9uhriYg4RrkJR2eGyAgZh7iX5seoCPaYWWioZuh5KCmJ6VeoJ8fXWPdnRzj3x8fHqFinOHdKVlgpifk3uYdHN8dXuDcWOCpYZ4k5R0eZ+vm29mk5Z3eHGEenR5j390fYGNd4KJdIl3cXqFkoODfIFwUn16gIB9a4uacHaCnHV8po2ie2eLmHl4YH9veX13i3F9gHN1g5J1goRqcYGTepB7jnVsfnyAgXeEmoOCeIeacoakjoSDdJGTeXc=","128.2|k5Zzl3uUgXCzcn9oqnlwhGh8hKaaqWmBcV96b4S0noqOpHloxn6Onnuhn2KZfmKGqG0ybz+PfqlyjZ5vp36kf23Ie3pxnpmyd39zbWlvgpqlmpmaf56dV2+VmqSLmYWDtYd+V3/8fZpwYpdyZHyko3+DdqKXcY58b3B4nXief3CXeHmSlnp6nY6XgpSZbpd/iWxecH5ol56fmKWKiL6NlouZcnmbh3mLt4KFZ2vQfKuQgKdzgYiRbGWLh3l4kZSHr35/cpl8f56euY6dd4uRh3WjgqyFk2aRhoKia4iEaKV8kpmboHtxgZVtfXl8gI+WjaGCfZdueneBdpl/iaSTjY1jfXKG1IiMhnuKfZ9ucJFuinubfniaeJuVlJFxmYONX5ORiJl8s39qdKl8k3yaiX90mIZocJVxlHmHjpeGfK92ZXt+ZIZ9g5CEnpCOk6WFk46cgoJtfJh7iXV1nnyIhIGHfnmBiHJ8lIeGeYaKiYx7iHiRe35uh4p3m4iChIF1i2mVioaCe3CHnnZ9gHWOfoSUgIV9g3uFY2+Ng5d+houMf32CgIF6fmaDh3N7kYGGh3iEdJqLgoSLaYCBd36CgKp/nn9wg36Td4dydXeAeHKDjYyJfYZ0gHWcfouafoN+g4KEdHGDgrFigoqph36AeHB9gHOEjXJ2m4KKkHyGcJhrl396ZYCUd3t6eJR/j45zg3+Hf4B1eYiDg3yDiYGMfpNwcnx9fYSIdWiRg4tveId0lpaVf3pvhYF4cnqAjX19l3aBf4B2hG6BgpCTcoKKgomBl3lmfX50h4mHZoOShXN7i3qNkoNvhmqGgXs=","153.7|t5ZNnMhpPFH1nn+Jb25dUIuJcr5aUXdZfb28L50drIpMdIdnWzjf3n1ytvVkcSNqaaMNtPt8vHHR2Zyn211xqnZETbRzsIr8Tl+4ncAxmG2xqXh1d+FzPdCfZeJfa6aArc5+x4XgtG2ej5mc8I1u7H95dMB+VlRagJFtq6i8f4y0iLXXcnaIlEVjdJ6TmYVpepvFSIRonZqKl450TomLvZuqtaWWWbaGc56Iq6iFn5p/mXiQzu51dJhpi6hInJacLG6Fl7drgGGub2bLdINVeaagpJ+Wd1ifhWObo4J+qJiktXu9iIWrtXJwjJOWgnGksLYbbVWcUmOKZKZ3ZqQIf1FTyudlRJaqLYt/aUDNUn+fjZmbd3SHiJpoeV1piI+DRKGim1BwlJedlXySi5CUmX7bmXl8j0ZvuJuIuKRqdG6OwmyDnIh+XMqJoV1ulMifcJOUPYqGa2ipgY2UwY/BqMSRgaO1dXCpj2ipioqql1tvgIyueX9fi5U5hUy0XpHAo3WGgHtIiHV2npJOfZCuitaFbY990Kl5hFpmbjhXiatZpXNdpalpgVmGoj6rXKxoas+RdDmslJl4r1x8lJN4hm2GvIKRh3+PtnlhXW90l5WKpYlgcZNwe5KShcqab4Z+zaJ7bXdvb1SQhKipX3N7in94fXWHkUHAXLdhaqWReTvEmE+AlV5+knSEg6SJj3WMin2/nnhue251VXSLpXt4doqRl3d9VIWwTddOpm1ZqZl4UbmDbYCJY3yRbn94lofBgI6EfJ6hd2Vpd1x0cIqjeGN2ZY2he31vi5V5nT67amCfnHZbuWx+hotrfZA=","144.1|eYlWb7l5Vl/Tvnl0aGViXXyFil+aiIfBeqW9LMBNZ7uofXyZV2KBNohzbaKH3JvWdqCqmJQptWiejoPJv4hrY1o/24eOX3VW2rdAkqkutXRcQIR7e4ZwyEFOeHCdimmll6SArpB2s2qXIIi0z3twXn16i2N5n2i1cY/EeqN2lEmdnKKec5yLWao7mm1tq2Skq5u1S5t6bnZyfJi4XJGIRIqKypR4Mr6eh5m8nJCCmoqjYnOmwTJ3cKSReKjUb2iSZpOyj41qlWheJZKCsJlhpHqKl5CVp3uBtV6CoqR5i4eheWyMfpCGf3d4hI69g41sWrODj4qWkWSgeWZ8kYFkaFiGpKNTdoCBUJzEaG13g3aIXpSA1W11nJK+dAB1gq1/p2lgp1CTjnCfh26PbJZqkYONpnd4Z7aqko53UWxLiZGNr2+Njnd4nn+kXFyglJx+jYeBWqSnnl6KqI2Gb4uDh6KKgNR3empxgpKAn3Vdg2uNiIiadYprenG3e5STaY6mV4qGaphhrYGGho1fgIeEi5OQdIR/gYV6k6JniESfeFtlZ4rLa7Vtj2h7arSQfZpvf0hujImOiYiUlImAj2d6hHKLdp5ahoGyZnp6dZuLb8B5X3tpkKaHeYmDiYWUaYV/g318b3JliWGiflt3cY6gicJ5kHN2b7CUkY9kkppwem6jZmWphIxuj2eGg3eJjqluh32JfX5tZWqIa4Z3YoBpiKaNm3WFeHxxpayMmG6TWHV0eZF9c6mKkXuLYYFrd4OYjW2AgZhye2h6cIhwjHxih3KPmISke4V2dmR+pnGAbJVeaHSHjaWHmYySfos=","133.3|wGvgVIdE1Z5dh8vZl8yirdHHrFh7p+dTwbLSooe2bKyEVbqnPLqLybpK2J0atVtSRo57kLMviT6H02CBXY6SlZOfw3uLXmVpzFibmkakikRpRGxQe0BipLWZYYd0dpltY32BpXBRikaB1GuChIuQeYF7iVhthZRZd4mWUYhB5J5zg7CFjK+5vE+SiWhno5Zjfp50loZsbthmRHKGdGyys5los5pku4uEeZJ1k453hmx4vFmGnbKKXKydmKysbGR5jnCZlmCIhJ5qPX2DV2Rrl/2ff3mNi4K5p39okop6j3+FVbRtYYCGq4pyjYalfKhoXVOycnebYo6FW2+QgV1WjG95h7FipKicW6aNmHymfWyIbohgbqZngWTDhU9omnOJk2pgbpN1fLCXh3iGUHuCd39pc4Viq5lplIx6Xny9dKSPVYeCa3l9imZsXm91pIaQca+bYplnhVVnmYiJnoZsxpJ6f2uahWKNb28+r3hlUI12eYp7g4VvfVudbHN1d6J8mXKAm4FolYiLeomOeoecg4FozH6AcKGEYmaAc1WgeGds13qckW+KgGp6gJx5eXR4d7qPd4OLkmWcdXBripB7g5KDh5ylf4BqpoRWgH1+bKt3ZJaOcp+XeYR4gVpxn3x+cpGDZYOBdpGdfGV3j3d+i2x+gHV5ZZp7YnVwboCNeotjnWukbG9giJKBgpWCfJadgIFykoNoh3x2boJ7aX5+eJ+NSIKAaXxslYhbc3GImJd6j22QeaB2bnOIj4Sjj4FzoZJ/fniZg1l+f2RgindnhpJymoldgYF2eW16moBfdIiUlH6Ma3+KkWxucYg=","130.9|gZZuq6Whg3ZFVHV6n3d3dmJ0fJx6gHiiertxr6JRd15wj22Wea2FTXOD/WSUUlunh29NljQ1oZKL5IBQXYuaYnfzpGN+k5R+wZ+qnlaun4p5bYiPgG2MbK1pdYSMhm+On2h8mquWnYJlz4lcs3iYgX+Af5mNdJKbgox5tpTHh3dkaYZxj2pzmmFle4uTcnKUX6OYnIxrdnyQno97nFV6XoygZXuhZmRvgniOj2pnkJlzhHdlk1OMaHyNhm1/i5d0kYmKmHqLjW13jX2fbouSgH1/ipRtfpZzhI6NbX+QZZ6Tjnlqe3KJcIyJgoKNlIORoYaUhYCdjJKRXX6Dd5J+jJVYfnKTTGh2roN4eImOZIdqbY+KWIB7an1Qi5RzhGiZcY6ecJeFfViIdHqKoYWOcX1+kYVliol3fImCo4Sch26PaYmIfHyTbrOOZoR8sYGUdl2dpoZLi2x9boNyoYaYmYF4e3duhG9thHNemISZepGFaoyMhIJrfIpcfZh3iIeCbYB6bLedh4KJj3iMhHKWh5Rqj3h9gm2GZYCPd4yRhJxsk4RygWSMh2h/fV6JlX+FfJN0hk5sc42Ob5Bud26Efm2GmXGie3ycZYVtgIh4iYmClXSQjH1yhXN8hLZjsXp9fG6DcXKMdpqmgpeFj4VjjGKBhnd9dl2XinaDf4R0g3Jjl5mJeI5veXWBeJWFgXOYeX94cYJydop4g4OEloJ/gHuSdoSBYn2AZYSGfIJ5mXR+aWuThol2kHV5aoBtjISTdpB7fIBrgWdth3J+ioKTfouLa4tygIJzfnqBdYhxg3eZaYdzbX98g3eQdns=","130.9|iJKPeZKQeIxDh5akYpJ+mI1/gJSSg5edb3S2kY3DZquXlcVnf3OcQZeP1c+YyaFIi4GElpl8joyzvX2Hz2Zmo3b8qZ11k3tuvZmad3WOjItgcISIeIWKZaFjk3uIjmpXdYmCkmpAjZOFk4eEToFneH+Ad5OBYJOXf49sb4lwy5FkhKV5cpmTkaGuoot3hqSQvXaoiYmabHx6ibOQn3FyUqZ6epx/fpF9k6iHioR4jH2WhHmGkq9xmXmhnKCbiXZ/YIl1eZWDhZFiio1uloCSh3yos3mOip+shZ15hXSPgnmIc6SXeoFemXOJeVqdh5CKcYuYiY92g4aHjWqNhndelZmBx4aIj56DsY6Td6abcYSBfIdzxLh9hZWscaxrWKXPdol0eJuIvl2JgYqGgaGFcn6LinmVdHhcuV6EbZu5hr94iYGFdHmIj2p1moh0kIydipKlpo2McpR1eYOAaoVrxYR0fqh9eZBvhY+RgYBwZo6HhnmPgoKUd5ObgnF8iJOwZYeFlKKeiW6LeIBUgoFthF+As3eAeoV6lIR0i3SAg21orIOUlI6FhZd6dJtybZ2FeqFwiJOCmXqch3N+gHGDfo2Fc4qJeH+fhniQZG2KgX6CbWuPiI1vhH96hGWUiXuAfn96jHxxiJlpgnGLj4WEeoR+god5e5lrd3+HdqB0hKFznZmVbnF6gW6Cf3ODeJyBeYF8gH6LbXiEgG6DcHSVgYh4b4B/jnt7lF90n4R1jWuJlJGwhJV7b3uBXYB+eoBjtIJ6f5iEfI+Cd36GeIFydI6FnYJrfoGKdHZ8gVqHhXeMc4OOlI+EiXNvf4A=","136.1|l5hwVmpwa3XAqY6VYp92Zam7faB5lIlXj7uGU1d9h6ZtaFh8iQDZzGl0i6d/vnhIfZUak6QhbIGnqZys2kxnsZTEiMB8nJbDcluWnXtPWniFyYlugLSKRZise51tXJ1xe4qBkHLRcmyEyZmlw3VotX6EfKKOYnZeiXube3RvgHybk8tCb7SXs3rfeZKWjKdoaKNNX2p1iI2TbnhmcIB3uHVwoox41MR3ipmhjYe0dYaWrYqZladyiIyIn6FUjZh4V25/mI51cH2EvXyHQJZ4fomIcIKGcE6vimGEkH+BhoV1gYedk4yXeHRxjXyJmXaWpKNfbzyfem9pboJzdIJ9cnRVk5mBo6WlWZ+Eql6beIeFWnaEnXmNlHFUdMCqUoyJa5KfjItyjY+ChXp5l52ejIKtcXeFkIh3lHOCpn+Rd4KRXXdzhYCBbIa9inZys5J0lpx+Y5dxWGCEeoGEYXyKoXiKgnVgeXujeYOBe4Wch3t0Zo6He3Z2gZxYhoKSeHCFnnF9m2hol2x+j4dxf4NrepGHhoeAkHF1ZoJmhJZWhpx7hXZulYJzdXWBpVh4ZZx6XqWQXqyPk3WPfF17jIJ7enl5hn+gg4C9YnhuhmuHpX6EmoF7dX2EgISHepCZioJ/o2x5epplgZ9ahJ6EgHJojl17dnmBnlp3Ypd3d36PcJCKp2mYfWGNiIV/g256joyRgn+bc3p7lG6CjnSDmYF/eIeQcXp6fIKfYIhynXxkhJZuloGdeph5aH+IjH+Pcn6RopOBfZxnenGMboKYdYOYf3R0co9efHl4fZWCcnCjfGuIlHCYh1ltknxvfYk=","128.2|pZXFeaCUvKibi7LQnb/R7q2htGOZh6hTj5uFTltjlJ6cjrOyi4SNpbGUPo+0gNCTi42kkIyqnIObY5GRa5CasHGFfauAZ4ZlgVltjn5OYJCWjo2Nf5GIZFmSkFqDfI2Qb3OBiohjmZCDg5OKroaZZH6AgGKGd3ddvITgdZV9pL6OhZtkj6GXuJ63rXB+t7Nlko6NYW+ukKF+jaGUhIanmpGCjZt5/KCqcJ23hIJ2kHWspYWFk5GOkqemopKkcHt5l3KljJ9zcm2WypB6kZV/jH+JjWyYmnqNlbx6j6WFhWuOlX2Ti4KdhpCZlLOUlp1rd5BudJKNnGxssJGQiX15fn6VjYS5XJyOX2+mjGV1lomEi4yJnJqJhJCPkJGNdKiQoW15fXJzjo6Cg3KIfaOAhX6EpoaPaKeqkq15cIFqdYCGZnJ3p4N7jXOUdoFohHeLh4qcZ3OXloFrnn+DW4aHg3uFgJiGh4eQl4eYlHlycXl2jYaJdniThJCafY6MfXmEjJCEpnFpeYGXdoWRgYJrhYCiiIJ9jnaFjYKIhXyFd3J5bnebhI5ydpmCjJmMfnd9lnCIhoB2ioiGhIaLhoqAh2+Gb498goCTl4SPhJ+ChYZ6coF7c412gIF/hH2VhIF+jYKEhXqIg4SWe3F4d3WMh3N7doyBg5mIbox/bYCGhGZ6lG5zg4OFh4qAgGmEf5iAgX6NhYOFa4iEhYx6cn92e4SJeHt7k4GDkJh0dX52Z4mFcGiRe3KGfoaFj4CYcISLpX6BfXyMgomBhoeRgHtzhYJxh4FtfXuKg319l3qIfnZtiod4aouEd4aCh4Q=","130.9|rm++b61vkLFQUoqeZaikn56WnGqGgI5leL2Hsa9inY16hYi+nml9OH2CrZeMunYYkIVwYDqgpoejmHZLbE9ohYqrvIyPbJlpyWeYnZiyqIekk5J3e0qHbrBTgFZ3d2U3omiAT2H6pXWajHBYh3VqZIF6jWeUd5dshnB8e5p//a1tbHQzcp6NqISUj3SauZpxg6P6oJFZl4CYgIR4kw97S6aDcqVxY3x5lZiSY2u+lJCdmopkbotzpo2prpqBdJpdhXa0lpGMkHifrIOAfHyQi3Z+kZmWmUZvtZiRhpJ6aYaWh5d6f29XiXOUlK/Rip5xoZOpd5mbp5KZcpadfoFmo5hotHOWqpBoZ52odnSggH5vh5KIs6h9aIR4dHZ3ToC9g3ScgKF4hkVpco6Lb4KQdnxjYnqjlqGCZJd6nmzUeJKPnYuOdIWKcnFiXpJceGm7j3mHa5yFdpZ0oHJ0g4mDvFl4foJgfJSHjIKUs3qYipR5bouihYdnh5djkHd6jYalYpSBf6hylJFrlIKHfXZ8iH2IsXl8aXN5qKSXgGl6e5ZzonuIha+Ki2OFjWVmeXeIgKtvg5R8hnaalG+VgW2Af36FhoGCe36FY3mVeqiGf658mXOQdYN0f3iLhniCj3x/XHB6lY+OgV67eplSjXl8iZODi3WHh2NnW3mQY5xyhnp6f3KmiW6mhXF6eYKGjY6Ien54dHyQbox+aZZ7lH2CeYCSgIKGgIJ9anBpeIyCkm2DgV2Qe6aJa4qEgHt+foKIn4CAfXhnfJ+CiXJojXuTgo92hoyPgYRyiH2FZGxoi36VaYyAYHBhlI10jIE=","129.7|n5HJloWSuKueVpCRaqy2l6aQ5mOQsZNcp1lps1m4lJGYoaPWvc2CUK+im0uSbtGYrHHqajjOh6pwVZVRTphsRolTj0V+ZnqgimGAaXC0XZ+WvYOag1WZrYZio4d9nnOBrol9VYv8haR4L5FaeHluk316emF+iZdjhXWLl4GXiJ+KbXOEcqSbg2mxsW92fLBpqWeom2tvjo93jpHBir6TX5mXh5OXgIyusm6VaWjWgaJ2j6Nli3h3lbqktoWecXOH6XO1b4WLcJ+VhYuXyLeRo4ycaaehnV+Om4OecqWCaZyHlaqCl3GdeHWepbydi6htZ5K7dcxqpJNrg42ui6DKm4u4ZIOb2o6JfIakjZt2s4xsn4KeanaTbJ2OdXmil5KSpXFsmaR3lZttcqqBi3SQhnuBhnqVlsSVaYx4YYWcd51yrop2aIWnlIigZo2qe4iklJJsen+ui56Jr3hzm4CGeHmDfXRufJSXenh5h3lpm5J3lHdthHhyhJ6knJx2hoRycIuVj6d8iqp2m3uzgXSLgn+AcoN/cXV5ioqPesR+eWmGhXmZXXuKdmyCjKB3pneEoXJ0nKGTcoJ8kpaJeI+Bfa1/moNegX1ibnmWnZ18fIl2ao+PdYaZgHOcgIRYYIB9Z3V8k4SJe3d7fWl2kHeXdJqCd3eFmJ9yk3WLon10gZKhXnqBipSce4l+eJGAjmZsgX5ydX2PjIt5cox5bXmDeoZzfYR7hYGSmWWaeIiOh3aEkYlkfoCFj4h6mHqHjIB4V2yAfXh0fZl+ho9nd3ppeox0k3eTf31zhY98ZrBjiY2CdIeHiXdvgIiKhHg=","143.8|fLOMT1ZfeHmptJGWm8GOf3B50ViavnZahF9gM71ibqeigUlWhcmU6GttbUee0ndXX29YrIRVW2VTYai8/DiZbGx1mm9iXX+iL2JxaXg5sGFld4hufpeasGW2baJlfZ92imh8s09uXmtp5a2uPnWXooJ/ZVaDkZBfhY5TbGNPjXmOmSyLj2Z5QaM4dmV0oHVrfWgeUpplcolujIFOgIt7yZl7YF5yvY52kVxamnqWZnZXlYmkjWWMWWBxdohXbHKTeW+Gc3ttkmhphZFufZWDilqhgoSCbGV4bU9/bkaOenVpZ4eOlo1sd41WX4VuflJrcHO2dIlrZWeadmpliIefkH1MPoiLqpZoSZ1SonFpS496XGx5ZW+Rl3JojaFxgm5/RmhxdJhykoeTf4Fydl2Ih35ijIhddmlNgmV0aJlmd4d2XW+OdH1UkGydr3aXnJp9k4tSV6BWcIOLQIt8ZXFtOaKEfl9rhWdpjo+CWXdsa492enpxdYZyd2ahjHyGepBQrIaLkz9cmnVHgnVqgXtwdIFeU4GBen6FUGp9jJZod2tofXZbhUVujHR6baKBhqd9gV6Xh6WOgnydXHaKe2aDeYl0bVKqgn98WoJRc1WOjGR2ao6NdYB7g3yId2prjoF9em+CaXt4ip5ue26ajXlsemJ7h3V3e6Nymod5jGKRiJFifGahZnODeXWDfW13iEqSgX+DcIJoiH2KqG16aoKbeIJriHiGjXp+mo+YqnqOdJyEl5ZcdqRtcoV4YIODc3h9QJaBf59lgV6QeZOQXnZsg4F5fX13eoV6doZ8hn+PfZFzoIWPj1N8l2hviX4=","140.1|THFxfIlwXJbLp19iUm51e3NXgqh9j2CabT92nIlTY4WHmrKEmfGCMn+TeYqflFlDc3LDXD7Uhm2LPIauplxUam2jRYFmoWVzb5enXbSbjH1fPG17gK92rZxje6B7j2dMhpR6UGYthYpzI3uhcYVXdH6AaKdpsIGYlWZqZIZgkpiikkT8ZUJ7e6tYjpNjYHmQrVvKkIGCaENrjbaaY7R6R6yDhJZvd5d+foyLYW1lh22XU5CZn5trk3ZkeodPkmPZboiCYsqIhmRkiX5u2qJsjWip1W+Xpn1wjYN9bXRqaGCDfZSci4mWlmqdioKIoG2YVpSSiLJfsYeFmWeThXWZoWilnqCYcoFnV26Ve3CEmHxskoRzl4yNlKJlZ7musrOmZZVam36HlH5oc3iCXpljkX7H0XSNhG6IlH6GWbN7iGxq14SEg3SfjFuGoX+fkbCVgn+LYXawipqvcnV2XYN2a8CLfZOfc4+GqZDGYYVfjn6GoHCwhIONeJ6eg32Ec6WlZJiCd49ngcVXd3RjenZsgnSSTYmBrJF1kq6HiYs/iWKehIVne3aDg456R5yFko56s4FtjIiZk36FoHiTdXl6dHmCa2tXhH6TnHWHgHqGsXSDZZOChnd7enR8gVyHdoZ+npN2jIOKi5FxhWPAf4eOcZSBhX95YpyApIB7kaBui3HGfGpqoHmFd3Z7e2iEfFZlhn+DiXqLiYiHq3eFaZKLg2RptoCCjnt2lY6hiX6UlGiLeqGKd2qMd453XndmcIF4SmmCgYSUepGDg5ebZ4ZoiXyFcXShgoCKeWt7kX2VfIyMbZB4pIiIdpJ2j3Y=","137.7|X6Wdnpp0mqOdVneGT4KimpuWrlttkJSGdWM0va8xpoV7fF+gj2jQMYSFrF94s4SVhWAAnjfilnNzd5ZRzYpTXHm9pF9zW2G3l4ZvdHe7qoSrwWWLfMKUN2pcgYmXgGJ/p3R/k4XNkYd+Fpxcr3ZXlH1+c1lkYJqCrIWCkpGcs5iRaYRJY3yDsamMhmtikZmAZXPEopiFnF5knauJiH9ZSIqbjoqCMY5wkFe0jGefjJKJhIdnm2hoS5p9jZBxbGSPlH6ddKOQk2GkpnSfer+BkmKdmJWbkmaVkpCbXqiJZ4ePtXy0jnFoZ2lVlH2smItnYLuKfpFvlZWakJ2ZfZlWpYUeeVhgZ5Z1QorDb2VoaY5tqImenoePaqtKaitwSrOJXmdfi7V7rFyIboqGb4qOh3yIknNOaaRuc3V1Y5Z1fZh3dImOl4mdhJOqk4Nvh5qafZeVUo9jg5ZtkoFzm4ael3yIfKxtdWF4opCMj3hqlpl+eXqBh4Vwiq2VimuVfnVzXo2RaMFYi3qAj3KLg3eYhqCBeYN8gGR1c5CSjV9bemh1fH+BZpiNimqEepqPcJ9+jHVudGF8aYp2e4yOb32EgIaGk3lQhH2sVnVmgIaJhXZ6aXOWgnV2gnOTgot9d4J9iHJ4ZIOFiWKOeWmKl3+JeIt/iHuJm5WRY5CAeX1wfVKufF6KkYiGdHN/eZCFjZplgX6TdXdpa42KYX92bX+Nfn5wfICCeYaWkKVtmH1ieGZ4Y5WKdIqFjodweH5+jIOak2eBfZhod1uLhIZ8dXdpdpGCfHN7foJ6ipN3pWWlf2d+a39ojJOFi5CIh3M=","132.6|pJiLenB1oXZZVJqaoZ5/i4yKZaWGYph4oFLyvl9wipt7irSmdZtjtKuJwICKhrQ7i4jynmyocom0rIdNYHafeojLhZmRnpour3p1Zqi+YIePQ5WDfliPumSeh16UhZJcnZl7pTzYcoN5opBYg4ibV4B/jqKTcZZ4qIq/gnKAfIJya57Ekai2dlGioJSXhdh4tGJ5pHBchWqWg5G5kOKjpIOBqZh4zI6HlduIlXa0dYi4mnxipFiPsKeVpqCsj5ZqinqPbY+NcIKLhYOEo4CKiWegiZaPlUmjhnuTl5GQdYl3iHeNgHGulo+djZ+IjoWUnWHCd4xjsJNvdoqifImBeZDKhZWPwJDaRZV8PXV8/YV4hXeTrIWAaYWljcW4fpzEtpaeb5Z4h8KNd5J5b6uDeX6lkYWlh6WumIuEnW3xfIRwtY50coKbc3KMYH6PnauDjIOTUovIfZWTt4Z5fXqBcYd4fqSOhJmuem+qZ4WWW5B8mHKVhnlogZdhknR2g46Nk4eImYVanaBykYeKhHx8eYywdHp+c5WGo8x1c5CHhJVqiXugZX6NeGR9nmJzgXyDg1uMjqSPkHqmpnuWiZeBc4d5iKiUfH2Kk4SdZ5t5oo2El3aRfpadhHqTfXOnfXp/cYmElHZ5dZJ1gpV3jXyYdaWBdnaAZWRqdXp/fYWHhH+rimOTnHikiJKBfYR8io+IfHxzhIGTmHZ2oYSFk21+fottqIR7hoB0aIN3fH+YcpGEjH90c5OPcYyIlYGGf32HcIp9fn+Sgp91eHaSlIOSbo9+h3OXgXt0hG2FaYpngpJwh36DhaJrh5FujIU=","132.3|gpaLg2d9em+8X3+FdG2EcIuLppqFfYxvrLNPb67igW15coujbGqfQKJ//JRGPcG2eYZlo7teaHVz15JcV4l4cYqHeF1rk5q9oHFznWlxqHiFl4+Df4aARXVbk6+Kg2iXdZd9rIqAaoB8a5hkyHV2sX58cJqVaJNriox9e25zgoqZb35ee4SHfVKEiImYhYByeKKnfpKQf3KYZmiDb2RGT4aAin6CRIiFim+fl5KMb4FgaHtndE12kpJ1gW+EipaMgHh2lHZ6kLCDMISfjYZwgW1seYqHjHlpfH6BhrGEko50gGFsiHOCdXx5iImSdX6PoaaAdnybfH6WeoKHfYJ4dmplfXh/qXOSXH2Ee356oIeMh3KJXH6FbH1gemmPTI5qaY2ehpl1aHaSi4h2domHjX1zUn2UhYdbSUuDnoh7e2SOpH2LgX+ccIOFaWxxcHWcf3R9Y4GNe2eJhYiJoXaDfniIf3RjepJzW2pla4GYoJF7dot6fIZ4gINgfoCBcXiFZoCMeqhid3eCh4OUf4aeeY92cYZ+e2t8hXN9b4VegpiJc3x8f3mBiHZ7X2GBbnJ0hG5smIOCZHJWgYxrg4V+gpl5lHl7g35+XX2UhmxudXaClXqMenOFfIWHeXFrfIOAg259jXp5clRNgZZ+jXiHiYh9iX99hmJ8YYBxe4ltgYy1cmhxlIZpg4iDg5d3hHt+hH2EcXuNiXxzX2yBlH5+fHWRcX6DdH+JaY1ucHZufWyLjYp4eHGLhnGBlYR4jnt7anuCfHBlfY17enJqboSXdoV/bo2AfYV7gYaEoH58dWl6boKKhoGMg5KCcoE=","128.8|nW6DY6Vbj52+dGF9pYKPjpCZeJpoeoxigmOio6eWl5Bjb36kkoh/ZIV2eopdTISmg5GpXznSoXikf4FwUbKgf5GvdqmIlIBGomdscK2joHKZX3hnfIV4bGB2dlGRbHuQhnmATZH8mmyKmnR1poSeToCEiJh6a4pn0m+uZpNmpJ6de2aIk5qegV6ffYuEnrhtcG60mI9ckV2CZm6AbXJtbH5uk5JmlH5xjbGIY2XLkICmkYhwfmCPraiGgJeGiYh1hnODc5yHi46XhG2BnGt1gFtzioeKhzqHnoODmYtsZ32Rf3KShHuLhI+JqIyeo4+NlnqSdHxxwY6UbpKbb3aDdW6sqn94zHi1VnWOgnF7qXpsn45/n5eEcphmj6DHe5aGmo6Pfox1e3FpcJaIX6KAjoB3eIWjlHWjaZ2Bm4Wxdl50oYeJZYWSaWdraYJ1dniGfVaRYHSiiIyBj3Rymod8goWKfpWFhJKke26voIOScIt4eXufhYVrg5pYi2uEdn2qcYaBfYRmeJaEj4qDenKHiXqge4h9dHmHoLaAcYOBgJVsfXmAX6OKh2iBiVtehmp7kWR7hZt2f2eBmZKPi3t7fJ6FjKOMg4B+hoShiZlznpmDkm2MdnVxeXOQh2SlhIOBdICEkoR9dGyogpZ8i3h/eI6AhneEdV1biIGBfJZ8gIOSeWpvkJCdiH96d5KGiZmDhn+DgoOMkYB3g46CknZ8e3Jzm4ODg4JzY2d4ZX54aYB9i1+MeW+Lk4mIdHtriYJ6k4aBfWmHg5l/fnOLjIKReI15ZHSUf4Jzh29+ZmeAf3ttaX6AZ5teeJCQioc=","128.7|jIWguFOrt3xiipePXaSdm5eUrZJ4mo9ll5Z0mlc4ioKDwXuylaxng5GkIFnOlXWilWi5gme0W5t5V4SGYKBeZYMYoFeJkGmKXmdZjHycWqOIpW2uf1mLomJ8kW9vyn6Sq1B9c5IBXLCIooKKlYVjgH5+iZFskm9sd4GbpGaidW15hZGDbISEhW+UlItohHtxeZBxj22IiqJou5ysknKnhIOpeJCcuYCNjlx6en5AbI51l4WEop9vaKObl4WhiWd4oHerinKHcVeJcnx3mpGKiY6FaZV+hbx1jIiNZYuCeohni550goGsjG6ZkrWJi5+JYX96eI2LfYhsooWIf6GUgY6bYaCYYYB7po15jbZdP4R8inCOd5CCg3mebU2OrHNun4dgimt5gYd5foNzjXOFeYGRrXdqiKedjqWBYntafZWHbYR1gIB2ioyRY4yGiHJ/jnhrmIdmk6Vsln1+aXV6dn1+f4WMd3aIinlyn4NnjHN6hoRsgnmGgXSYjJl5h3drgoeUiGSTiIGMfnaHgH16eHmDln2AjYp4gXSEfZOogWp2e3uTgIeGd4uDkZqfmXyEgnN/hnp9hpmIeIuMdIiBhW93bZqJfn9smXl1kIuCaJKCaoVzdpF4gX6EeI5tfH2AhIV5eIeLfn+ng2lsdnh+hIJ9dn+CjpmcjHeIhnV/hXNMZ5CJbot9dIB+f294e4CJfH93hHp7goV4fIiBaYJye4+MdYJ5iYKOk4qGeoeNcoKAcWFpgod0iYd1d4GKcnt2eYd/gH2OfHd+hnRniYBqh3h4j4GGf3iDgYl6kpBphIpyi4FzX3edf3KLiHg=","134.1|k31Wk7GnZGRBdWxsZGhdY2iDep5vi3NxhaycYLDFnIRloH1yWImDU5Wj3YKqCKe/rXR7mXpaqrCd/XB0UphnhmzMb2qRm453xXRKk1pfraOeZIGfgJJ4WE9lnoaZi2yfo2Z/q5jeqKJ96Hp0y3dqjH5/jqCHYJFweo6TpZyodGlid4xgbJiFhWuEhY6Riad3fZZ6bJV1lHeIpYOMh1llYnyYgX6jhoGBr46XmIOwlqOHeml2dj1woIaRfnnBjpF/mHWBj315kJ+bbnOge3aBiWVrbp5+iXV3loKgdoOJhKCakmeLbXuGdG+Be4aSfImToJqLdZOTbnWWcZR7caGHgISTiYWDvWSvnV6JaJRif3eEdJKcc4RueYuYc4+GoXF5npSce5p4fkmPgqCLp5iecX9nhnaVcp2Tb3+Do3yze4SLe3aLaYR0aJqFdHd+gGB6kVeSlWd6gZBofYSFkYuQoodxfZtreJB1X3Nrl4OacZB8gYqOfIluh2tTnJiGg319aXaQkZGUYHiPnXxvfoWEiYiNlXh+g2l3iWh9cn64hpx2gHqneIx0iGyEhVqBknCCdmR1eZRqcoZtc4p3e2WBg5mHn5mren2TZ3akb4duZp+Dl3GNe4hsgYGUiJeOmniAi3B8jmh2c4qPgZ6Cj3uAiHZ7ineFdFp7lYZ7h353eZ5VgZJjZYqLemqDgJCGkK+YeH6FcXqPbXx5a4mDlXZ/epeNW3uGe4F2YWiTaXluZ3V2mW6Rg2N4jnp5YIBsioV/qZd8fm9ofJ1zeHd2kIKYfod+jolufYR3hnOAZXiGfHZnbnuQcZlwb22QfH8=","142.7|lXmziat1m4ZiW7PPd7m5rbKgqG2CodBZqcS6sa1qjK95SIGboLSp3Ll1xqxGHOWNZZyiYc+LpWeTsntUAbB7rIPzb7lncZnQrVu8oWK2pnGP2ZR9eWSKs72zeJhkQ6eZXIp/VKuTo3ly+3dcvIx6xoKDaXOShplfhHNGjJqXo85rb46JfaGdmEa+iHWavNVqdqaApJOYjsybdHRdj5+Bwqp8hKaM93KIVLAwZ5Zhk3B85Y5nh9x8j7p7jLx5d5akaG+FnoKNj4GLr3+sW1+UnsuHh2qDf1uFjrt+oIJ/mX2YuIqRg3Otm4BynIt9pJ55mXjFcWSihJKUioaEg485f5OGiaO1O25+KmV5kyOyhYGTl5CMLpaFaGt9fNt6VrqLYHmZbbJyiMhwjHKKjaaye350SH6Nl0c5kIqBl6fDdWyXbYyHroCddbFoXpF4gmOXWU+cOWWBg1yGbnaHpoeynbR7fUOgfYKjQGhmhn6VfZR3hpB1hYR9gcBicWF9h6CDpXZ+l4FAXZa1gY+Jf4ahhrV8kXt8gpV/bGFobpVTfJhlxnVnmmOMiHmDn2KfZWCHeLaRjkOgkY2Ei4FyjpiCiGaEnG23en1rvX5ziFtxn4J9lZyTc2+TgYmAha2Fln5+ipZ8gYZrb4ZffZSKmHhzjlWAjIiEpmOsUX+NboGNhUeKsExakYBoi4p+gpeFhW+ne4B6koCDmmp1t2J+kXyBd2KUa3+FaoKfar1YW4qPnZeQW12gbFiBd3WMi3pwkYCxh6F+fWKlfnhybl+ZZ3yTcpJ4ZI1PgoF9hJuEuGxwiZGVlIRlYWqHbH56dIo=","145.2|k6SgbUZjnMuNXJSOqrHHvaWip6ZPu9FOqKvotVi1oO9XNZzHdt23xpdblmYsMIGxYpi2qTuiUmy6f5lUNJ+nYGJoZ5psnWCJfVPCm622XWindVpbgYqQusmkYIxkS6emIJl9qMh3VG1/qJ5iz4yklYCCcKNgn29TjI1IZGFnobeKbmTBlZCjl4g9lZJt1cZkoZzgonCYmb94TX3Xh5vIr6pDyJZkp6OvRrVnmmdZZlhvt3plx8aVcrGPltRpk2zKjm6gkoSQcJGlimJpsHd+q/y8oDeuopi5sHZhmKKPbF9heLJzinWzlJRtqNmhxo+VaqOAcpeamJJsd5t6flBlcoOTgc19SW53vVegwHO8hopumWlfMqOGa6aalZpos6WLcJRkrGZyk6aPc3JvjVN9hH6fbYl3fWV8lY2Ge5Fmc3WMvIh2g4d4eHpmY3mVn6eMVGV4rWaujHWet4l1h3KBZ7aDelmZhHGKaHl5a4V8p290ooygh3edhqlqbGqOf6CNm3NgcYCsc8yHZ4pwgHR5dGtilIF9p4GGbVl4fIZVhYGcr3eMgnmNdqOHfGlojWN7kqWNmFegj22LoIZwinuBenR3fGWUgH5OrIZteH9vu5uEgrBxcYN8hXVqdXxnj4F9lIuHc154enlggX2TcnChi6t/do+DfGtxmoZ5i4KNc3uMgKVelY1vjXh9dn5zb0eQgX2Gh4NxbHh+iImIg4Buen2Mp4R8f4N6cF2BXXqYo5d7eWhjiFyMkXaKZoN2g3d3QYiBe2aciGl4eol8aYWEfnZugYChg3ySh3Z/aXF/f5KZkn9yaGd3bI+Rd4Y=","130.2|YIhhn3CgY4BljWhsmXlvhHWPhWi2kXlviVytlWeHhZiznnuIoIiWtIidqW6herW6n46ac1f9c5+xr4iNspCUV212hGeQa5WckXBhbomVaaCErqKcfq+SaV2UlYKUlpOph3h7ZYhgcqd/3IWLenuToH99kWqZcoxvqnS9jnWRjpN4iomWjKOdjJ+HkHKSrMV0nWfAi3GVhm6ZmKupjJSMp5mMmJyPfKiaiKyub295d4uceY+En3GJnKaxp5ehcYuElXaybZ2FdH2Fk6R4pZmRmWSdjoibopyFpYSOjJOEbX53k5zMh4SIhIyWp5+2nIdxdbGMd6Jxl4Z0oIGunoyljpOef5h3eYKwsXKliaF7l4Z0qHmKnqOEgbRpiYawpJ+Vq3J8oqJ3o2JtdZV3h426e4CRtIOYeqrPkJd6aXvEd5JxrYR4eYCVmHmhoYyElaqVhmaYpnmpjqaIfHl4cXx9gGl8gL9vhIejg4yginttp4x6h3Sqg3qWgJupkJeFh3mLlJaMgK6hfZ5+gIZ7fnl2e2ychX9+lXeCmJ94iZWVem+Ge3iVdqmEeJuBsaJ7jYuIh16JiH6Ii39vp5uQg2+Bf4J5d5uofn+WX4SceKqDlqp6d4mKenltgHeCfXeTqn19knGBh3lwiZCRfGx2jXqEdpF/eIaBkaB3mYiKj42JhYWFhJpzlZeHhmt8enV8gZiTfX+HdYGEbHqGZo57cYCSenFykX97l36XmGegiol3dIx6f3t9iHWMmIeEbXx4e35pd5V+foZsgJCCcpB3lHpyg4N6cXmXgHuMfYyBf4KchHhulXt1f5CDfI+Oi4Q=","143.7|kYJNo1OTcGFDr3hpY5BXaG6Ug1Zr83xqd1PEjbE3pp9dmz1qQp6c13F8eUyZ62VGkn55rktmXJ2PpW63m1xjZlbGwHOcXI2gkmpIZ02KqYevb32Cf3Ryki+zc5agk5lqu1SB0j3lYHlc/H+orYJnnH6ClFaInpJoqpzZo2fEZ1lglo/SaZqfVrJ2cGaSmZ5yXmQ/e41cn4qOm51qg6uXv4mZpnaV7olrip1xr3GPaqO0x2Ofr0JsY6h8daeSa5q2bne4bXKGjWyno2ySbYV7hlSIfqV1iaCEnVSLekiKcppmhmG4Zo+xjmxzbZSZgGliqoahc2FpbX+XVZ5+co2UXX2SVpBsaHKKzZ57V6BQYnV1f22ElWdollurcIi83GiErWShfJ1zi2qocoJwmJ23b4J+7HReYLa8oKl5s6ezeYR1S36Jb4iHYau3YWt52aVleViovJ9YiXhyZI10qHOQbrtxgJmVdmp3kphXh3ake411eXKWgoRkh2xIfY2Fholhn4x2d46zoYthk31efniSc4aYdXZ9dp50Y6Zyi3u3eKWFdHmPUHF6iFqEqkp5nYl/bzuUXlyDgoG2YW95enGBc3l3lI20dn2wknZkZXSQgJ13o46PeJpZgXqBeLSfzniAeIh4aXJvjtSzeqS0i3V2dVp9hnSKdE6Osn9xemuPfm4xnKulZm6AenOHe5d5gp6aen+BgnprZ3WHlYd6oYx9e6Jsc3+EYIeCWHSjg3R1XKFyZVqIjadwdn54UohiinuLgZx6gI2Ne1l/cJSenXmikox6hW5gfoNviYaBYoB2doBakXdwWah4mGh6eXw=","153.8|oXGchFSKdn8hxZytV6qs6VeCp1CoRYDJsSp1S1cAsKS4hLwssa2M3dFxnKGjgMpfeIsKU/sqWHFZ1XTYwmxZwFx3PHZnV37AYcJPUlVLXXu4wJF/d+qSK0+ndKagjpt/j4l8MkBLWW1t/HDBwYtbyn5+aVOHLna2nWV9kWKLqZNOoj6RYpyAmbY6eGZ1vtSlnErUX21/pqd4iMKGqq2GvJ6QcYGBYlejbIByUaFcaIGNnZCjmJhqnY58g5yMaG+EaZWAX5hzbUW1v5p5gX+meAu6gnzBhaNVXK6CkZF/pH5jgWbIfZZ2kmhOUK+TdpVhYbdOlodXSWtleKeWk38Uh6tEb6KKLIu4a1xxVHN5bYCfX2p5esZ9mZ2+bX5wfdCPOWFkaIePv2xZlVdzd6mHZ4Fvu3GcLnRgmHV0V4xkkZhldnNxmoqKo4l8m6FeaaWahWTBcWlyelNsn22RXHKOfY5ygsyedI9ktI2VdXpeb4CRimyeeXV0i4i7ejesnXFtpIB+wqt3WEdlgIhLfo9xdZmrmnWDnI51i3CVjDR4eF9ZWImDZ49vcHOFhrmdeayVh1mPdGR0Z5J3eXCAiIaBiVt2c3y2doOhmHWSTnGBiFN7XmF2kpddgI14d5KponiCp497inOTjFRieWB7eYyAbH58cXONm7SnVrGgZHGLgF5SknpiYGxkimh4iGNyg7CPdH24knmLXZKKXXx4YGSDh5dkb350coalp8RZnJlbaJiOYZSKemF0aIGHWnaqbXuhm518g6CTe4t/kG6GZ3ldZW6Pj25vd3V8iJF7sSnCmV5rnYJ5k7eXcmRmgIc=","132.2|dmGMrHG2gYNBh5uUbHFyfHWAgWxoi3xbd69Jnl+ahmdzrF5Mb5KBSYKY3ou0buuPtWZQbME2dL9D8GCGXHVsgV67gliAcWOlwmBUmGKhZqqEiGSjfnRvlU9lo6OVmmWEtm5+bW79dZx8lmSGc3tvo31+gG1mgItgUoFwt3vFdWRig4Jed2pgfJxJf3hkblNqS5x6lnN8iWhgq3lbjadXXHOncnWwNk1dplODd5K5erJpl3GDQV14V1ZkVHCSe2uKe3Rzk2GGdJKEUHKnMHeGkF9ZfrJ2coJqeZ+gZYF7l693klh+aIJMaHlsT09xX2l0bnGbdnmVU41xbIJkdaVLj4lUaGx5mm1xqWxyWKFSonKQcHuegWVwgFldeEchaZNUcHNpZ5N0bIx+i5eAr36JcYBGYH5cU3hfVmN7bZB2eGmNYoR2dIFsfa1xf4SERFBtl3aAoHdBeHVyWn6JnXyUiJB0fYF0e29RY4ledH5xe4t1dIt3g3lvgGWGkYN1iIppa3yLfZKabFuioXabf4mPfZB0end/dHJ8eV97iEycfG9teXt3mYSJd2yBcIiFX4CEcmF1eHx7cY50Z4JwcYp+hot/pISIe32LcXtxdnCGU4t8cGOIc3iWfYaLf6x7jXuAenx9bnV6h1qEfnSLiXdyim6CeXiAgYmJYHmEe3J2iJRuc5d1eX+AdIuAg5CAj56GeX50fH5yaH2FdXF7cn2KfHeNbYJ8bYCCh3Rpf4CEamuChYuChnZ3f3V1lH18iYCMlYJ8fXxzfGd2foBzin5zgn91eolwgXp4f4R3a394goJtbX2IhJl2dnh7dHQ=","150|P7aNmGW7lsLbo4BhYX2HZJWckWvW7IqvszSmwVyta8LSv46CcqDIEou5on7RpSRprW9wwCsAaKllmKWaXE5mWXBeVkNqbZ6ulqlnWnDBYqlqKbCigIiNjH1FxN2cqVdbpIN+xGR0aJt/M6+WsHFkpX1+bWmou3OngJuBj299n2qtjmewcJKheqprm3aWcmybhFHbomzIbH6lmLWtbJCILqOgwpGaO36SooCio2OgdJ2JXH6Ppi9xj394e7Jkd4nKlZCJYLWRcI1rILyayJ5qo4OVzJeho4WOtkSYYpWNX5RwiIuAlIZ5mHSBfqS3d4t0YtRtjqVZdZFrrHBzrofDeGSMorBDjIWKUYOfo4BwkZJkU3OOjICMhKifb1q4y4KGXHJytW2QoDygbnp0goVxjoGFrnqHf69pf2R1UaZvh5VmyY92o3qBsnCaYmqlrJKBsI6aWYh1lFaAo41wSnaArLiQgI1wepVeb45ok3pfp3aKfmyjhnWVe2DJiKCEa62cWHufhbNkip5VkXRogWxqeY16lIqBbYN5kXJ9i3NmeV2deo2ASa6OeJd8ML6apWp0nohocKedd4aBenlvbleAe4B6fYxfg4ChU3iclV+FYaB6bph9iox9f2uHe3J+qomBa3R7lIqAh5+Efl69e4eCbZqCdoZ6X7aOuYBpmZlqcJKQeWaJaH9qb2CGdlt7jZZmiYKEcnqWdH6GWHR7aJ9sh5RpcIN9hn1srLGyZXN1jGlxlJadeYV1hHRuW4VaZ3yMmGmEf2lle5WCfZ5iaXtok3OMl2uGg36OfGuDspKAcoOEV3yclJ6QjGuAdnE=","128.8|anNrcp5hcXaphm5qb3xqdWBuiJ2Ajm5zfluDpn9iZoyHW4dza5NkspdxsT5dVIh9fZB6fEf6mXaBoXmGq3ZyWWJub1iAl22ajXNpbTymgHZhm3Nvf6FtX2uVb4uVVpWCdYV+g2b8mXVlr3iGcn90mn98e55xZ4pxfn2TapB8b4eLhYCZdouCe3SDbpBrZp14vWmil317aopvcJqSY7KVoXdnhHlneKqhcG6MgG6rjG9zaneJjHZ4kISJi3eHi2tyqHqNcW2He3hkcX17kXpteWidZWmLi1Jrg2dylHx2bmiRkoOOeYF3fHdxe3uAYn2SYpl/eKNsXI1/fmuRgXB/eGaQTnlrbnSTYH6AYV+FmnZyrYyDYW13hJKneHCOsX+JhZBmfph4knSFdXuFcImKiH5xsXmPXaWKiYqFX3qFfKB3cYmDiHmZjXiDkXCEjqKDZnSYZoW6fYtqgYF5kYWHdWeDgJqOeYZ8lnhVeoNqbod7k3Z4hH9+e4Gcc355c2xalGlrhKRsh5dveYZxfHeAhYF5d4KAjYl+b2qIeYt0hGZ7cXuZemeLgH59hplrloV2k1yIcWhzZXR8iH6Ih357eIWDf3yTgX58inqQYpJ2YnGCaouIfoJse3p9hH5sloF8j4V6hWOEd5GAgmh2h3mcd3iCgYJ4iZh1m3pximiHc2GDgm5+gX+Uh3V+e4mDe4iEgoB9gnyFYoV6YYeFanqGfYZyWoF/fnyKk3uPhXdxdpB2aYdyeX+HhYeGZYCEiH+NdIh/fYOGfol1hIJxfIJsf4d8iXRqgIB9eId9bX6NdnN0lHlth5lrhYWEhoU=","134|fGhomF2RPlbJlm9mo2twand1UKmMbHZUdlKHpKykWoWZoTF0lACBmGebCOWW5mhTo3wmXdj8YqReN4CVpUiftoJ/h76OoW2RWFhjZ86ko5xVyniVeoBxWU2SlGeGmoBonWWCTVatY6GWbHGQh3ucen2BjqR0cmdffGyJjGqNhGiijYRak4iBep+fc5FrlIlma2KOmJN2YVtwjYNmantvkoKIf5+QbnllmqNvYJ6jcJOrg4uOg3KPYX19daSGkGmANXGVaYSIkIxZ2IiCYopyeDh9hZOBgX55hmuOeH9snopuhWCUhoR+f5Fzk4yceHmUWJhQckhnjo6UhGJ+jJBkZWpCxWturpV5p6OYRKlqS3uarXCRv3iFiF5gjlJ7TpyXepdeg250gWRrjp90hqKJj39/eIZleX2Bm3uCU2RmdXxvaoqJYHOJmHuScoF0mJuDhnikn59uaaJ8iHSPj3h4iWiMgYBrhmifjpG0fINeoG52c3WjhYN9drOqlHaScW23hYiJa4qam2ZriXlXeo2Dd3KzgoSAaW+GibV0imp4hl6RTnmPW8KLiHp5uKlxdYl3c3SGaoh3oneXh2CQe294gpx5h492hn2qX4VpY4CNmIqGYnhvdIFqfI2KeXe7foJ9anCBaIV2i49pgl1ob3SDcpaCh351naVqcpF/dqKFeI2LmZKplGeWeWp7hox6hKVwh4OVeYJufXmHkISDZYBxd4VzqoKCiHqen1dyjH5zaIxzi22ghquHaIl7bXaNiXtrqXmDfo5vhF+Oe3qbjINifXJ1enGPgIN/cZWAX2SOfHNtfW56b4d1l49viHg=","138.4|l5t9dFFvmYs5s45nrGqMt42Bmatr746fh7B7OVXxj7xeh3Jze4Wic5yCqXJkAHKHkFpFlCHGVYdn8IG3jXykgZPcL5Bso4ngkaBomns3W4GOvYCCfrqUjGCGj8qIlXSAjG+AnI/KXYd+tYmsinWi3n9/cKiChmucd4tDYGJkhJdfmHJwlK+qm1DchZeOkXqUf5yEVWtsj8aOZaubodyCe6VvhZ5ygm57p4aJj2LHaIWTsn2dao+QU32abbhwk5LOool5lZdubbeOlXFzUouZmYCWpo+NiG6gq5ODWZKTXodmZKihgI9zf5JslXZxmqGanbpeiaOYcGZpdYh+cHqXpKFUmqCd4o/Bk1hxja9ZaIVloWuAXZ1/mJ+Cj4Z2sJlzXpeap3OJq4OIb55xZJWkcISDeoRUlmZBoGKGo71Chq+NcG5xVoZ+Z2GQp4mmh3WKgYqPjldNbpZ6fIJsoXJhlK9ygHl0iGOPeGuAf4SbpG+GjouLeHd3gp1ViJyHjaiJfGyGoXOIUoOignFthXCOdGKgtnV9lGWGXVh1cKh9hpyYh4KBoaRudW5/gVRYj4KHhoeAgZ6qnmR0Y4ODbXeGhrZ4f5mXeH+faYRiiGJpepyFmn5yiXuChXGHeFSoiXh9m3SEZoZ4cr5FhZq6c4R+i3B7dXqDmVhWm4mGoYeAdaFnkoRMY4SOb3OAdJZ1faGKdn6MdoVpm3h2onmElYCBgoiNc3h8hYGWYUqKhYZ/cnd9mJmogVJuioFwa4KTjntZuYt6f4Fohl5+fXiSboOYgWqJl4tme3x3gpOAVYWihYJ2enmPl3xuXmaIf3E=","130.7|e6Kyi3WMldFuWJWrhqi6xrmam4qrpqqtc4qohZGmbJaZlaWmfubHi6eSrH+Vf61WpJS9pG14dp/JgZFQg36Dc2ieen+Gh6aprqh4h5GJj5dmk6eMeZSVhHeElJKMjYRlq5F9qFzkeImEPZ1bZ4SEkH5+hoyimpClvouZl3eNxtR+a2iifpWti6N+kIGhv8uciof9ioRmb3SsiKN1j6qCiJ6KrqOIeYqOp6mYmXzAeqCwcH9jdKyCnpaRoZV4gpmydZGZg8J/g5ZomZyRooSMopCSsKWdiliZqZSejXSTgKB9hJ7MiHBji32QloSmjnuIkZ6diqeGj4SJb22wjpBmsI+kiZaMvYaNcGWqcox/pIt8gXuTr4mHaalqgGmSqaKZl4WXkZ6KnWyMfpZ8h4igf35/mX6WboGkfZ6Bj6PCiH6Cq4GDbXmQhYNcnH54UZWTkXiPdm2ShYCIaIZ+hXuIf5F9fauLe5CRl4umgYCLnI2JfYOSgIBzeY97l2uChoyQg5uKd6N4baNxnIFxgn6GfYqQbIB8lIV/oZ6Him14gYyJj4Z4l5qFhG57jHd2eX+BmnCGg5qXgXpzmHmDf4CDeZN8kYZgfn54ln6XbZyFfY6Aj5iNjXRugX6Re4SHhn+AiIaAin2FimalgI2aiYl6g4WBgnp6h3dxgH5+fYaDjpWadXhrj3WSg3SAfYV+kIl0fn1+hX+LbIeGc4WBjIuPhWV9j4F/gX2HdnV/fn5+d3+ElIh1e2qHdYGDZoNxgn+Cdm5+fXmMe5d7g4J9jIKMjo2Ob4GQfIB3d4KJZ2WLgn15foWNiJlsc415gnw=","137.6|eqGOnVaff6HFjHWAXpia3HpmkHBwx5BXeJb1V5D3laZnnsiLeP11sqyhulmWYrllnob4pDCrWZ2u1pqTJXRgilvlY4x/dIRmylpziGBViZ6XT3+afn6HsHKgpoSUoJJzg3N9p2lPXaRs1J2KvIZme36AgHCCmolem4ydhGaJn8GdgljDbJ2orqqHkHmMouJnmY20ZIOokZuLkaGTbK2UpKqMi5+W4oWRntaSl2SAbZOuqISIhYJwpKCSoqKPe4zAinKlh5N0hayXs3SKjmZyn4eOrYySpKl9vJ2OhXCEY49qjISKjoKopnGYhMulkXhzkY6jcq+LjW6Gm4+MeIaUgWnEfKu4nWWZvVmKgbB6woZqnXCBeJSKiYiZcMqc2aiuoXSKe4N3hn2Qc511iKGIjYB4vneWX6GsgYx6lZO6dHOEjnh+coJ9b3ZvZHCKpnyOiU+zrWSjkJt7ioR0inV3kqqJgIKQeJCKgI10aHyOd4R2lIa2eoKahIpikI6HcqB6lJWUmY6mbMV8goFzgnaHd2ulhYZ+lI92i4OLiYZ8fZKbmnmVbn9zfpuCdGJ9oFt2qXaPg4mMmH2Sin90fXZ+fp55iI+mg4CMoneXeZCCiKh5lJWGc4Rzf3OFdmufsoJ+iYl6kHiJi7l1fZKSgnWQhHF8gYaGbmJ0o4Fvg3mKiKR1np1ii351gnWBeYN6g5qVg36Dgn2NaoiFn4l4jYF4e3l/cHqBh4VvaV+aVXWXe5CIkmKUh2CGgHuCX4N0hntfmJODf1+Qe5N8gpaMhHuPiYhzhX1nfH6Lg3GAjHl8dYx7iIeKZZuHbYd/dn4=","133|Z56IfF9wkq+ccIuIm3aTl3N2SF6gkYqif1mfmqQAZnSekFGPm9mTlnh+WaumTmWleHd/jY2eZGhtbpptIY+Yd3CzTIVyYpB/hqCqa52Zm3hhYJN7f2uTpJqSb4eNhoiZp2J8gqKGZ3V0tZdzjoaXdYCAdGGPsXCZvYKAfm6Ej46NeXqdjWRyn4Nrh26DfHeTTmfFkI5van2AoY18iJCOkqSdeZt1cz1liqxcf4iDb4mZro95jnSNYGx3Y5pbbYTAcIxybZOFjEhlhJaBiYGGgoORvI6GkHh6gaKJb5CDgnNtj4h8kXydlYyDgI2Io4FshIF5h2NopYmShGuGh4dqf4Z1q5J8XXV/W2BokXGJf4yDenKFbKqQeIpViq1ph4OUY2eIf2eIe5V/hnl1Y5GEhHyJhoRhiF90l4p5eqeKhVR0ioSJi3ifiXp/aoN2lZWJiFW6YWdLp5KJgn6Dc3eFibeCfnmKhGtrcoCFiXt8mXSHb3i9gYVweZ+Wh3uAgaeoiYeJebFma4aUh3qcgoN/eYidm4J/eHiDeol5gnmDeXmTeIRUao+IhW97dpOHf2CBfYuFiHOQm4iHeIySeI2BhXZ6fIKUgoCJk4RtjW1/so54epF1iXuCgYOHeXylwIF+dIeDbXaEgp+Tenyoc4Vkdnl9iHl5cJGOf3qAb6ODiGFKo2tmdIuLd4t+gXZ5hniJgn95hYVxf3uBoHN5dZF3hG92pIJ/fnp8kZ95XYORk4WGalaXemVwiod5j4F4d3yObYt/f2OPgmNzhICWent2inaKZXWNf4J6eXR9k5Fuf4qNeoduWZiGa3CIin8=","133.1|qoKcgnhxnIlNn5avZaiotqqL9KFz1piwlqdWU2epoKBmjr79WUOjPKqQLWJXltZ8gZXdoC74enGncXOmnoBldXxcma+Amo+1RatplKhTan2kuYaBhIl4XEtjloV1lG1th26Atm51eYqJ0oCZsIJop36Cf5+Lf2mkxpTEYnZhdr5mjKySbrGpVHXZvo+Tq4WdxZmOYXGIlayMZq65hG+jT6mHpIJ0+Oi8j3e1omWPeYKc5XGOjZRyotuls5CpjZmjpY7ZjX9zcZWhsXaS0ql+cWqBkoqNn3CPppyIkamIZXt7h2yecInPi2+soraUpaSRp6pNjJyYtW5xmZiScX6YY3++f33ArKGCSJabgXpvoXlnsHqGuL5ujHK7c87UjJ6Cu5OgnGmLjouecZV7Up6dcYC4pXeef62mZrGFqao9ioOLjnR2fYeSZWK+c3NpdHaVfoJdU5W7jZKDsIxumnp7RJl2fo6LeJKWkYCXi4WimWqJnoZ/eHl/hZ9RipyLgml/Y5WYl1RZopOYhoeSgHWSe4Sbk3h9i5N3kah2e7aEg6GIYYenhpZzeYCEl1V8gYyAh1ZwnYl+aHKjkoeJiZyBfpx8jHujen+QmXiUi49+kJmFm3xwj6NzgXKPfFV+knmAjYR5kX16fE6Cgp+VcImdi5B7d32FmVV0e4pzd35xhXZ5X2GSg4WAiZmFd5B5hHCReYCNgX2OfHp7in+FnIZshpuIlnp8iIOcXoyAhnh0YW6GhmN0c5SKgYaJnYWIh3x1fZJ7gIuLe5Z/eoeZe4Kbi3CLjYWAfXh8iZB+oJKDeXNmaIB9Zn2Jj4iChIU=","137.8|Z1iVhlCIprDJgm9tTZV4eZu0pqSKeJRRdJhVqUprgpGDfmB9eGyRm2F+pUKGW4CicmdRWi1fVnJqYXR8gJxQRZhnglaDnZbNZFWdiXqpU3t6tpZ9fodejbWJerFmjoqVaYF/X7UBW4CDNGZ8UXJUsX55gqSWmo1aZ2tRfmRvl4akgF9IY4p4oXV8eZKXmHpne5KKl2echamdd4d5THOWkXJynJd7XnaSYG1ybGZAamdsc359bphncXSEo5R4kpWHt26HiqSMam97mohnT6RemN2gZWSRmaFvj3prYJ1gZGpocc2geX5KaWl5roKArZeXlZmWcMCIipBkj3uSg2yAsFVgZoF/R4p8gXe6yn6FgWxrcW1vU4h5fZltampIcnl8cpSUr5twoY9ucl5ydVStkH9xTnV1ppeKeY+Jl3WZdqKIjolwkYSEd3KAn3CLWoZ7eKVmgHN9emmMgnpxXnV0iXKNflpldIOVdn2Hl4STs4x2h4ZxhXePfY9sbXeAbYxpj2xufIiBZZ6OZ3KodHRtdXxmnoZ/fWp0fH2KfI9thJCXlneLm3aMcJiAkWqNaolwcK2Id3WYkYFmj4h8bYN0e2h5ZHBdh3tmVXVzr59+k4KElKWIcWebc3JoeHVYa4aAdXN3gp+JgGyHgpN6i3SJhYmBcoiAlGqJXHptgnaIcXe4foFulItncoB8eWd2cmVwin99cnuEj4h9eIuFj4eUd3KIeYR5hn6Jbpdxi3WHnn1veJtkgG2Gj3xwlXyUcHd9W2yFe4VjenmDhXlpfYONh4JwioiNgXaJe5SIlIWHcYGYknd9l1ORd5CNfnM=","129.8|zo7SoqKrw7Fchru9bMS3sMG3hJtycMRcu1X8V2RqnrxoyaO2k6aEq766sbrVpo5Frourg5OFnqyxdISMc3tukJSjoYSMmIxNx1+WZ4hWaaqjTYKvfFqQo6aRrGaKs49h15mAfFu4m6qMMIOFeoJwU399jZqHiJJktoShr5Sp55h1gJWJdLq5llGbl4+RvNRroGPDYnVzl5iNw5Oal4ajm6C6ubinknyTuN54foG1jqy1lYN/pmt3qJ6erMuljZJ+gnSSa7d3dnmecnahpXyPmqOxnsOsnGeNoISyjZ6IgqSSn5aSg4CCpHWKo6iykaWRon25dpZorHBwj5Wyc7lcmpOVs514v6etTKOlc4ycwIWAd4ysqpWFgqCrd3SsaZXRlJGafpd4m5B6gKCMiZp8eH+GfHqjo5mOnZCEpXv9eJ9xs3N4fYWjaZJtY4x5m6akqZ6xWZmji52Nsnx+d4iJuJN8gJ6AfJamim+bqYObZZN4gnKVfHtsh5BVpmF9i6OukYSknK9gl5JtoYWBgoCDhZuVl31/ZY56p7mHdGWJg5xoqnmhZZVzeGmEj1iVdoOFg5+Khqifn5KanXCPhoOBfZGEj5lffn+BfnqcgJx8lZ+El46Rc46Vgn+hhIyVdH6AY4N+k46IcXmphZ16j3iNdJp+dnWFaFuIWH2KcJ2IhYapnmWhkXKahX5/fXyGl5lufX54g36TjYZ1eYaEl3yAeYxvgXt7h4J2YZlfgoeIkI6Cj4CReKGLbYeFgX+Oe4WMkW1+gYKGfp56hWBxjoCXfpBzjHSQfnpzhm1+gmptho2Nh4SIiJR/kYxuioQ=","139.5|aqFrq7WRXmfNroOJX49sZYqgrWKMw4qyka+sUrewYbR/h7CPcGyrP5iKy5ZKlJGOj5t3qzWlsIqq3Ju21H5ioob9qM15Y6KDmatolI1TrolgQ5mYfrSBWl9jlZx4nmx9mYmFs42lqY6L75+qhXJjmH6Cd2KZb5yobJCynJ2em4uml56BaLiriYTLoW6crqOdzJhXapp0Z5OacKufbEyCSp6OmY2T/OGqiqK7nWSUmJGqh3+XjXBuuJqZno2nbaGRppGLk6tzlqFjlIWbo5psmoyKoqJ9moOntISRl4yFYZ6akZinjY+QjGyelY2Vo5hqqLWZjLGWmnKcdmxzepC3lWSKro2nmJOvbZKdr5SDiIdnp5CVtLKJjpPBbdi7l6CXhWujpKWLr0uTcJWNdKSskoGjr3eujLCFm3l3pZWiiraMhHeNeHpkcZSqr2uDp25+cIx0cZCpgHaGeYhvvYyNnI6KgZJkdJaOgYKtiXWbepOJnYeNdopyeXtigbOLb4mZYneRoERxio+SkYpmgXOxjJ2Qrod/oHp3hZJ1faOFdpePl4iqnpR3imZ1aWCAlpRygHxvhmuDlXSfhIF2iFZ9gY6HmJeyh4C+X3eYjHyAh5d5mX6Wjo1nfnOLiYeakISAqGx1mJNtgrRZfZuqlYiLin59jHl4aGR/pYlti49vdXl4jHCJZoZviWWCeaaIgpicgoKRanmQjXaAl3p6lICZhaOGe32GbHhvapShk3Nrbmp3c4uieoh6hnmJWoF7mYN9spqBgI1kepiHb4qbbXqVioyLqI1ifIZ1d3OClXugdHZudXd3kGqNjHCIeok=","145.5|07DnYbpcqt0wfOuzTIHgy6+wUUljqqKlcMChRLdZrtBVTTl1eTHnq51XTuBUTrVhQmGKs9giskmPh4yDhTFNnmB9QImCUofRgaFJoMNFsE+3zXtYg4iiVDiXWp2XSoV3PXmAtVEHrVKXF5x+UXJNr4F/hkuCdl2duJVtY6BXqbpfeal2X4ibiKTaoWKOmKmUk6nWWZqIqFaMWJSUp/yKopteqrpcSZmEOradmpYunEvKV3x5d4lkeES5lLuKaJOJWYtlm9FykmOwjGtlho6aqUt/wkabsI2xoJhVWLGfnVWbZZibhX5ZiGSsmmSIb4hco7IwjHulg2qccqeBbU++gqF6w6GmJ6nIX2iaWUNAgY+TYJdaz0uDgJxAaGlbc4umnWGeolmLpHaWikiOZpOWbH12UHF3VnF/yYt3rbViiaSWlHGNl4qCXmiGnoOdiJ+RZKGiZHiNeU+Id42LY4p5knlzfn5lc4WfVIu/cXifqGaGhZC1eYSSirBJWbx3jYW2k4tdeJlmfXSWWG5liIZxjojQYXp+j2NzoXZmibZ8daCDO4WCp9ZtjZiDpEmFgHqGlGSNiV+pu3pXinJpboaIh1aJYr5TdX+gX3OIYnuCYpR4noFohm1vhodai3LIb3Z/g3F4hXRrhuJyeZ+vY4eEjpB8ioGLnk+IpnaFo6aHh2i1mGtulXJhcn6EgmiLa7pieH55b3iFY26He3l4nYN7hG2UpHqEdoeWV6WihoBtXYmGbp2Wd3GIcnZxgYSEdIOIr2d8gHpgeYN2cp2GiHadhWCMfo+ZfYKFjJqBnZyIiGpkj3p3mo+Pd5Nqc3E=","128.7|VHV2np6lcpSFdZ2QnYyKoJOScm2inpZwcKfap578ga+io5OVc4WagIGlVJOOzbyrm4bpfk1vm6DqgnR2wpKcemmav6ONbYljqXNvlbWjm5mEhpKegYRzqV+FsFmPpoKTlHh9gZF6mKGIf3V4YIaYZH+AimyNkGxzpoPIkpOMmJCDetfGkZqckaizoXOKkKh2p5e6kY6hhGiSh761d8usg6GYprCYtbmWnLeygm2VjpbFjXV6tryPmJTDs6OMc4OKbXetjayIibeCnpiitpN2m4SitZiIq4K3s6GTiIJ6bZqPkJezdnyZmou7qYGrp4l0cqF1eIuTv4uNnIKkl5SZiXTHrrGnsJWebYqkkJJ3n3hzg42R85p3falwjp+forGzqnN4pGl6pIuDdZSJiKuNfn7C04aVdYrJyaF5bYqFeYmLnoeGin+QmIOQl3qToK6MlniXcIuqk3WEdIB0hoeKfYOBfsCRhYmmmJK2gntxinN6iYe2g4KKgK+ejamBe42sfpSbfItzoZ+qjIFnf3aMhYutgH19pJOFobhtjZCJe3SEe3mFrKeGhot/k5iNgpV8jGuDj5yNqoCnq5F1gH9/fpmEj6F/f36qpYWYfJ+Om7J9eXxyeod2fHaShX2uin99nIeEiHpzjbCGfHCCdHmCh4mBhYJ/f5eCnYB6j5uBg5KGhHOUlZF6gXp9eoCGiZSAf35/hYKHcnKJnoR8d4CBfHSLpn+BgICFkImYmnqQbYN7lH2OepSIj3iBaoFxgYR6in5/fpaRhI5+d5KSjnp3iHZ6cY2SgoKEf3+Gmn6HeolygXuRgaKJiZCNeX4=","125.3|joruoVyq/e1hasHCaNXhzs3Comt4ptNYulbSrKO9Z8xxk6WxZoSnramhY2+Do6qgoI/KmWw6YZ+HT39lXo1rb4RPkG2Jco9+kl6ZaVKsnJ5hjIabgViBo6WRrnR/jZWWnJR+o6DFY5V5OoVudXpsd397hG2LjXRhvIy1pm2frpx3dqx8c8mwuZHIqHWQlLNpqGanmZCUa7GLiaO8hbK3oImfq6Smo5Gqm66QlHmrcqKdm3B2wX50laiws7+fdpB/qnOVbZWJjKFki3q0saKBmMi0faCwpWqsinygj5+JfKdumbR5enibinWeqKmtoKVznY19dZFrn4+RiGurdpjBeIWsepuDnKSOVoayynadr4B8cnKbf4J5eKqpc4Cbh4qupnSamW11qpiPfpB2kYZ5eX+Qj3yVkrSgrJR7noSJd6tziYiKknmgbZihZXmUtZt+kKyUYIOrjmR/p4V+lneUo4V7gHl0eoqQdoVhoHyVd3R2i3Z8g4N1e5Vgj6F4f5p8kYWVp61ljI6HnYWZgX2YeaCCkX19Zn16hYJ7hK+Ye5d1h3mdXW6IiHJ5k2COjnh/hZiJfoaajoiLjIpsiIeAfY57oo5hfX6Cc3uQpJKFjIl9kph2c4ySgn2TeZNufH9+aXl8iYp+g7GcfJd8d3eSdnyBiHp5g2KLinZ5jnuHfYOIkGmKfol2hYmCf416j4ZufXxzeHuHeX+BdoJ9k4BzeJF1YYKBc3iAaZiYeHuKko59h32Ad4qCinWHlIGXiHuWeW9+fXp4eo+IfpBuiHuUgHpzlnJzf4N6eH2Aj6RofYmPj36LfXp7gX+JdYE=","126.9|iZZsoKSaaX9Np292pXF7cYJ5pm5604lwgKZkbHKskZpwrJ2Idly9TH2Oi36MWItGkJ60mIM0n5OZh4KsgUKgfIiGMJx6cJPFanK5k3ttcIqSe4eUgq2Qk7VrlcBxqXNVro58n215nYhvuYuewXWds36AenGMqGdzkYt5n5OVaJNnkYt5krKdbJCSp3eRj2x1rZR3dndzjaGPlYaMl3JzWJipq3Skk7OfqpOSkX6JjauEpnqUfXyRqLB8mJmAd5PbeXeVjoh8eJuQm3ujlJ2Qip+HmbCNhaGDiXaZlYaRfauSeo2Mfoifbo6bmoiKoJJ1paphepaSgXp4cI2CdJnCfpSifZeUqJBvo2aaxq6snIR9bY2HZZl7j3eVkf29mYKCknSfrmF8i3WLf5aGin+XdIGqdoeipZSTeJN8osJleYmIoX16ZYCTaZK8hIGRhnN3kotpmWWygnSZfYV9nIWBZ9F4fnBnhJOPZYZvjHubn2l7loZyfXpxhZFbjZyQipV+apCal3yVaq10m4h0goCbhoNyjXl/lmuEeYpohcd1e5yUgXqQh116e2qCglyKjYSGfJNxhImSf4N5fm9uinqDd5GEm1ybeYGXZ4eNnHWAoYN7mJxre5F8g3+LhYZho3p+oW6Dkpxxg4OFfJzFbXqPh4B/e3OCfF2NmI+CjHxygZiNgo9beW9qiIKBgZKEjE2Oen+OcYKPkG+EnnR8l5F1epGKhH59boKJZX6ggoB/mnB/kH+BhF1/b3WGhIF1iX5zVY18gINogpiFc5mYdHyWlGx8i4p0fH52goSBk5mWg4KUcH+NhF6NbntudYU=","135.4|dZtcmVxvX112nouEooprd3mPil99cHmskLCvcq6Ahp5xgpORoYWAzYR7WIhgTIPHjpRri2z9XYDJkY+j1JWfm2dhfbR1YpR2S6dpnLxzqIKEXIyDedOWYGqlgY1wl6Kzmn9+fqyrYIqO6pGZzoWfiX6AdWCQf2OehoSmfWmKhHeBjZyfkYZ+hWd9m2yUuKSWqJ5wdZR0iLORg6OylVm9t5KMpJZ81ru/jaWafX6YboiilYuTnn6QpHqflYuPcJqhjouQkbB+jo+Don18r6GMkqaXi5SYrIJ5nIqHlJqHf4ZthYKqiIqqmZB/ksaAoohro7VKiZKZmnmXfYGGd4dBhJOMjqSsjoypin6Ok5l/aY2BrnGJlaiLkabKi7WTpIeKbGmfoVyHnoN9f5FzYZmWfoK8sIigdY+nlpd3nXZ4hIyOon2LcoJsb3eYo4xvfpOIdnx8iISOkp2SoX2BpXd4Z5iDgLCPhJOQsHHOfniXhWqGlIuzfoh4gnRchXOuhXOQnmWEpVKGd3iXhYppg4GTd3qploB+wZaHj4l/cXOGeJmTcoWQm5V4iG+Bg19vc6OFbnCQiG+Ai3GWkYmOjHaFjJR3iIOxgIGXlIWabo5vo5p5mpNtiZFugYCJdW+qjYGAuomEk2iDdGFueZWCb4aCiph+iXyBbF91ca+JcIaNdHRTfIV7Y4+Lh3OBf5Z5f3+Yf32yhn+KdIR2jYd3k4B9hZ6QpH+Cd4GHZm9on4Z5bZl4cHl6gnx4j4eJaH+UkHp4fJyAf6CIg5R1g2aQcHuSiW+LjoqTfYN6f3l+dlKxiXdxmHpzeXp9hm6Sh4c=","141|a7yjpb6NnoazYYx6uXujrq197neG2Ipqj3U4yW5uo2Fzh4XWltJuI5+QnB58aMO4kVybqyaas5Nzdq5bvbqwSpOIhzqFdqKbwWxceUrJbY6sy5WRhMahuk9VinCbhV2Tp296qZnhs4lpE7Zihnyug3+AhHeaoZVvhImpraO2g4SRb5+JnJqdqHaqqXmfaWlzZnmToHZ/n4+YmcCRhPxnPZyefIqcSG2Ff0zBl2GVnJmDf5Vta5CXRa2elmiXdaKm0njAfHSQdoWlfIO1lL2JnWWfiqR/fmODp6SWWYuUY5qerZeqn3WFa5p/q2qtmqt5urDBeKx6l5V3e5u9dpicz4J8O3mIbH5/UniSiWxTgZdnl5mhfnWTc6ddmxiTmLdinHixnah5jKCMboiRi32FiX2AyoZHoaSPXXp6un1TeZB7Wop3kYipaK6osnqqbpKhfH6KWXI/k3Jub4dvtY6pcHeGfrCGilqDs3pslXinsZN5foBZiHtwiY1ShJ2Uf4NIXZqLZ65dcYqMlm2ihXGojLOAa4R7k3eHZYSXfY+ve6iad31/hn6Od2iHjVKRmJV+o09oi1WIc4d7X5p3bpOFgHqIo4VNgIKPeYpioZR8epN6o3uReoOQhnCPh61fZ4J+nYWGXY6QfG6Deqxsi3lzfmeBenqLoFackpJ5plluimFYZGRsapl9bYx/eJyLi4ljgX2Pg4NjmZN/iol+noSWe4Z4ZoN7Y4eaXa2GkXySbmGCXpFudWlvln1xeYN/k4OmfmGCfI96g1ODi3x4jXyejpF3dnxuhXx1h5d/h4yqfo9wdIdrjJ95eGyVeXA=","135|pVqaeKNvjn5GdpKopIirroJ9q4l0lm6bUbhMok/Hg2WDkmeMjk+fsH6DAW11O5uijpeHUZGfoIt9IWV1j2aekGpMYKuLiGWvR5VlnZGiWX+CwWh/g453TVCWi3dom5CZpIuASI7TnYSEPl16anWeiH+CjIlmdm6SnWyZcpNwfKhlfoRLk4RwdoedooRhvIeMjKNHlmlbg65he3dtin56o3eCY26Bp6GbtX2PXIfIj5WSeX96Z46OfHqXilekgmJzi4aGlZaIcKR+w3mAhJeMhW1lcZ53f2SDdaCOkoVzhpGUbHuXcX6DaI+Wh31qfo2FXo5Shn2chYtpbH9kfYy2dZJ9aFnJ34Jmg3CUg6x2SHOIkY6Fg110en92j3laeV1htIJihHCDgollgaGKdniZcYBtb4aBeIihe7N/X5dZhIiPVoZxVYBTiHWfno5/a295iJFOf3l+iJmHZHSCmodvX2V2fWFuiHWLfYCfkX9ojXCBh4txgnZwgHqZj7B+ilZtkI6NfDt9cmOZjoiTe4OJh3GfVXmClF+Ic2t5frSkgWiATYCEo3aKdWl+t5xsfn2KfmeIkJ96dXBscoqFi4l9hrKFi35ien99a4Zuhox7bnqBZ4RxiX13f4ORhmuRW3t/k3GCdXB8fZOjfmSKdoN7jWmBdHWCl5hmkHqOhm2IjJxrbHxwcYeRh4l7gJODhHtxeYB9dIN3dHt/h4R+Z4R/hH+TioN4fX6Nk1mUgYlnYoSJmX1sfHB+g4OKl3eEi4Frc3F9e3prf3KCfZCQiYFpkHaIgZF2gHZyf5R5YKqKiGxnlHyQeV1ye3iGgYU=","145.3|Xq7JbcWBwcXQRJyVua662qafeVqohMFHtCeg0kl8adCwzXuKbF2KMqywAWzH5verimLRuSmfu3tGYqU9eLK0WIlpmJNtY5G4N05gTtDSTo5iypeIf0mKtz1kpYqItmCLrkp9xZE9t5WI3a1ODISwsn+DbFiPoWRMs5GNZqZUkIieX3e2n62iW6/ZsGyBiINfy0y7sWeYbHF9kM7Cb9rGTbiuort5qV+XsoBaqmeanpGwv4FglauYlKSQo9mDa3yElGu4XZKSaXNmxZ6Ks5Vvh2Spsp2gy3iGlqqWX7+OZXSmgJegk2uYl5mkr7GQuaZpfJlnbrdP4J9jtGeyjYmTbGupj42jv52iQoycg5pE041ndJqH1u6NZYWsmdmXavOzdGt9rlxtvqucc5OUUrCoj3qsnI2Ne5GLoXV2bY9BcZdmpo9vhHu7mUCDfmp9X3p9u3t6T4WwkKaPsopxPpVxVXGLe4eLi5mVf5i5WXhwvGJzs2q0iXmSetimooJib5SVYpiwon1Wj4qzjW6ahHRfj3ayz4h9WJaPsttukKNdeW+YVXWZcLSVbZZ6gaeKa4F2eVRuodGWmn60s5udbp+BfZuKe5ekg36Pm46gp4GUs5R2bHZlboOSfnKZijugqoJ8V4aHlqV8kWcoem97Z3ega7WCcXt4naZvZWVreI5wiJGKaF2QmpqabpqEfFqJkISLhX1khIKUlXSGt2V4a4N3dnVkwIV5on2hmpZ7h3KbZWOFnnR5c46OlY9vn4qjZ4RoZ5GCfIWRhZiSfpugbHxqdmtuiWiig3iGdpV/o49jdZZnZHiYeJ2OgY6NkHE=","132.9|eZCRhX6SlplJapSkca2Op6OctamYn5qBhaGibbhxpbKgoqiQg7RydpaZhnGdc7iNlZTyjC43fIuqkYVkl5ZyhXe/katuoXpBtX5djn5wtJWqNIWWgJiRuEB8oGSGmH2Bq3yAjHd+eo94t4lqZ4NzVH9/c6d/kZx8sYS7iX2CtatmdWaldpC0hpOXipJ2oKB9rJKCdZyAmmt/lZeEn56De5ygkJqQ/ciApKWqhmWcepeqiHtveYV3s5KOhZNzk3KJknuIj7R4k3mkfI+Um3aUkmCMoaaJmGaIq4qZl3SPYpN7g4KWf3qAinmbk3uGoneXX3bLfK6Qqnmbh5yLkpWrn5zBiKKzo4SbPnKOj3RvwodoYHuUr5N+dJJ4eMe5iK+KgJZpfpx8koiAb4Z5eKNxcX+CrXaodn6MhYeHXI2Zfn+KknuQhYhwmXt+o4mQfXyHnW2NSXjBgW6AWoBycH17c5l3foyMeZeZiIGseYJlU5V8kIaRfIhthoKpkJiGi5CIc5aZk1VWgaqKkop7hXGDfI6UZXh/nYp8iZd7gJFWiGRqiH13nIZ7j22GU6WThn+IolJ5kZqMooiOlY+CinKDfIN9g5aXeX+PmHqdhYd7h5eEaHeVfXmBg3OQfHiXg3l9k4J5lYR2gJx6hGWSknyJhWp+jXaIYaKIn4mGiYN5h4eji1tsnY18iHp+eHh9jZWPeoGEgX2Oint/sHiDZ3yWe2mBfn+DgYhim6CbfYaQW3eHi3qPdHCPhoKKa4BsenyHnop7fnmHfJyLd5WecINphJGCdYdme4V3imqAmoCTiJNdjIWPf5CHfZSKgYY=","124.1|hYR1dJ5raXhfmX9siWlzf2pwWJd3ZXGJmGHObZ9van1vZIlokbxZn4Z1hKVpSIqNfXS2fb79mXycnYCbSnyJoHaMSnSHko5XjIefbXBpm3xoYoVygIKHoqSTcHCGYY2PcXN8dZPLlXtvxX+TnYaJcH6AhZaIg22GgX2IdI6AdGp0jJKvhIJ9k25+jYqNbJ+FfGyUb4+EbomKdH2NkJuWloBveYlwf2ePdK5ueZKUjHGEg4ORjn+FlXmKiYSTiI59goF9cX97i3hnn3p5jGmLgoGIgm6KjWNsg4t5eH6DlG2Ojnx2gYaYjISQiJiOiI2NmH1zgndviHiNhG6Pd3OCdZC7jJuJaW+XdGl1jWmTjYOPrYqBZomDjoiMgsiPs36ek42WgGWAfYZ3in6Feph+d4CIjoGPhniekI6DmnSggHZzkXqGinqSb3xvcYuKnIV7cV+ld3GBiI1/jH2IiIaHjo16foSMgoyJfnV6ioGTb3CAiHaWfYSKeophe4GGh5SMjXNxlJ54cZR7e31ygYZ7hoKLj3x+hYmBhH5/d5CfgZJ6i4CDbXR4hox9kWJxlGqEgZOFdm6Bh3qQhHmLf3iCgoCEgXudfoB+koCWdo52oI6BkoJyhId7gYh+hICIoH1/goaBi26FeKOMgpV5cX97d3p+hYd5cWV5k4eJhYeFfGdcmHtwb3uQe3h+g4SCfXuNfH+FhoCLeYF4joqCkHd1fYV2fXyDh3t9a3mKaIWMlYt6bGuQfGx6foh8b4F8hICJe499gG6Nf5N1hHmDiYGRfXaDenZ8f4KDeXOAcHyAhouOgoJtcYxwc3WAhoA=","137.9|eIl+kWqRfn1WaoyLaYR/m5mSl6KnhH5rfMKJtGlYn4ekiqV5o1i0xXORkoiXYmlnh3lrbVFZbInQsYVsuGpqjJafUJt7oI2nUHCzoY+wa4qdapeMfrqTWrCph7hpgZp1jYF/XYxzb4V2zIRsj35rr4CCfKWPf2htv2+AlXGUnJppdJiKb5qYsWiikZKFsJd0fqRjlnSCmL6Nk4twknyXs6KQqJKSnIyUgaubam10coqUj4xzhr9xlIGerI9pj4OfbniRmq2OcWqewJmXb4aVgaibl4aOf3uJjZSOdH6Ea4V2k6CthnmOlW+Qo4iLrYKTe6ZEdoiijox1gpaglIt1iZiMmLGrYZ6rYnSAtmiYjodrcXiIgKiCeKJrdf2kkYCPdpJ8o192j6VpdXh0h46ddXuvd3eQs2KZjomId42ReHaPk4V5kIaRjZCHrpJyi6CRhZeIZ3FogHGXd3h0eXmUhJJ3fIiAeY2slHuqgYd3kml3f4+hhXp7hoiYgnSRjpKSn4GGpmlra4yOiXmChHR+eZaMlnmCpYd7f5J1epOJhnWch3phsnCIeH2ClpqXZo2KeK6PgHGZmIqJhH1/fJGBfXF6hGqgeH6XhHmDjoJ3v5GEdY5sd4OEgXWAeo6SmnmAp4N7jJZ5eYd1gnahbHhoi2OEen2HdpWZZo6OdZCLgHJ5pG1rbX54epB6eXd6hmOWeXyUgXiOn3V8nn+EdoWBeoORjIN6eoOKj6VnjYtypI17c5KQeWxyfH98k3mRd32NcZB8f4t7eY2LfnibfYN5jW96b5F8gXx9hX5/nXGli3KUl4B7kl+Kd296gH8=","128.5|eotpi3CCcICtWmpZi2d2hWBxcZeImWVmb2qCrZKuj3l/ilZqnp9xkneBeF6AbI2winF7eEn0coRggZBXeoGJUG9baV2MlJe2hmtSc42tj4aOupKIfYeGokiJg6GVk4Whgot8bIhqcot5QYpeaHmIp358i5aQjW5peXmSd3R+cXaUbmqdhYaAf5Zyg4uVfYRwfW+sm4WJi3CZhJuSev2ViomCjYt+RmeHhYSOc296dIiTcY9nf26FZnmOi4GDipScjXWZc5OKhpSQoIV3cZ97oVWVeYORlZ97mn+Eb4t4bH93goKljXJ6coWGk4mThYmNlZ1udZlyi5CHjIyZg32niXt8c5eGioCRtG2aZ6xeiIdysnl9g16NbJdbhDxmx5aCkoyYnG50lIZ1eJZ4cnudi3x1loFoeJGwiZeDlpJ2eH10koiDbIGOe2+QioSwe6aHeHyPqXJyhp6JeXx4knh0dZCFfpB0gm6RioiUhYSQqXB5g3adgoCLgpFsh5uDe4t9i4WIeJ2jeJuGf3d/f3uMemagaIR9hnCCgIyBipGZgpCLX3uBeJuKg4qAqmxwk4J9kU2DfXWZj3Z3h5KFeXyAgZF6fJNlg36Ib4B0hJ2Dg6GCkYJzeXWDf3eDfWWXeIF+g3eBb3WAh52TgJGWcHh7eoqChIGEmGtspoB/poKDfIWUeptyh5OEd3N9fIl8fJJwhH+Ed4BxeoCEg5aBj4B+eXN6kYKChoKRb2Cgg4CLaYh3hJt0h3J8lIN5cH+BhXxic3GAfX5ygWp/fpF0lIGPhHR6dX2SgH+DgJGDgJKFf4lniHtzl5WEdICQg3k=","132.8|iJNwh2eeSIdPm5h4X4x2WoBzV554fWpkhVHcda9fZIhsf2mHapZ5RnOGIPqhhHZggJqnnuFRaIawG36h2Dxi3WSIc9iTmZOBemm6ZsVzqIhfs4qIgISItrtnfmdpbHNlXZaAqYYSa4uTSYmZOXZneICCkp+OoWtoYIyGhG6Tfotrir2YbJt3hHetjY2TdoVwjWKqc5WvaX+QlqhykILDV5iEd6SDjo6nXMSFl6EpcnS1b3CTlJRxoVeugYxwjpiHd3aOaqx8kmhi/Xt7mpmLhoifnV98kq+MmH1ql2uPoWd0h56Qeol4iG+ZiYSTfoGRpot8dXhmoXiVkmpzdHaRlIyh14CQCZNXtJV8dHO1Zn+Za3Nzu3R9j4NscLVznXLKk5Ofpm51mWCRkF91oI+Pc4Ker3aZgoaVxKCDpnifd5hwj3uKonl8aJKNl32crZySdoWCqJyKeHCbb4SPYXiLnnZ2gIlud4edt3/AiYOdkG55bnKdf4aZeatWbZSEhYrBZnpseoKfnpRraYxigY9ueHWee3p/doF3jouBeqyGhJ2UkXlueaF4jaN5v1iQlpmEfLVzbE+Xp5Oml2ByjGiAiVN4c3hqe4CaZHeDa518i5uDmIZveXx4go9ne5uZcXyBcXJ4h2qDe8aWgJx7b3Zlc3uBiY95k1mZqIN9lad0em9fjJylf2djiGWEiGV5c3FweH+BcH2DcoB9qZWEmIOCen1vn3yEfnmXYoKfoHyVmW91aIWgi6R6aniJYoV3dXuFjXR9gJlueolvfoKTkYWWjW96d3WPfoOPeI+Al4iIgJGZc4Fyi1uMlXxvdYg=","137.7|oY21n5qxm59lqaCem4Gggb5//J104qOaerU+U0o0WIFnsrLHp5GlKJGnTHztw3eAsnrsgpWalrmNPIywtHiVaXAkoGGJmpG4e5aNnnBTUbBUnImghH6WqJ1MkppmkltypXuBcY+ulKmHG4qnWoaXkn96h5qJwHKXYoCNrJK1i7GBktGWj32Ol6aivY2WdD6OmaGsYGeGX6mQtKazlp6WQqSXoIuWdM6uij2zdoWLjpdkf46dk/SOVrSjq3aaj5i0novMlHxya1JWVXd3s62Ur+KMmoWHmXiztp2Tbp+Jh4eOlMl+iI2Yko2oq3ephreSp5p7iq2ccmximWCTcpm/mZm1e558V6c0nojMyouLWIeEeoyTmIeLmIeYjTprsY5uwo+gwGaMjah0gH6Mpm+BfoGurIVckrefirWFpqo2hbGTgXFvjnaKbJWmnpGid4GQlL5dmouLnJZ6inuDU4aIiZJ8f3iXh2eDhY9fqoOep3CHjoxke3SKc39UibCAiJV3Wpx7dYCWn7eYhHqOgIJfhHthjoKBqZKHcVt2jaGJhJ6cm4mNsYpzcZF5cVWCj42ErJtrjISefYt+hYGRdaGEg2mDcHlSf311rYZem5ONZqWEl6lxiZKRg4KIhKhNc4CApZCEan94jHmnhZ+YcoWQioF7cYF0i1qInHaMo4FsiW6XXo+Kjn2cep9/gGKDgmBrgX55hoRrbHWFcIWCm5p+hYKRZ3t3i3WGXnmckYiLjWOFapB3hYqEe4p5kH2HboKQeWiCgIuQgWOGeaZig4CXpXmDlpB7gHWFdoeDYqmCiY6Nb4Z0iGtxiYl8jXU=","125.9|eIy8joR317xro9O1YriturikuGFmk5pss2ulVo5ia7ZudKW4asJ2db97lXNoSepkfnfEl2PAgnKbhoGmlHlmdWmbaXd+ZWmVlHBrdI9YjntolWaCgI6Bm2B8fYaMeHtqg4R/nmOagn15XIWdYYNpj32AfWNqhIVzsIqZfoSGj6J8kYyrcZ2cgGykp29riLZ2oHOxZ4iNb5xmeLK2hPzDepuDqah6h46wd5qckHaIhYGjnnWTgHFxiXmaiqGOcG+Cv3qMea90h3hrkHCKqZKAkHaxl32innWAl49/d6KFeXuBlIWfeol4hHKKgIh8ipFvcouYeq11mm+GiXGgdX9snYCvgIuVapisX3qQWGti2n15nIOEk3x7jaOacoaCkqCWmm5wgI16mbOMenyAbZuFe3+JlXeHbJKIfaJ4dIqRepF8n3eCkHmYe4F9knmTWp6TdJCPY4GTgn2KpYV6kIOKaZGAgKGKeouJoXatgnh1e4N6mnqKeIN8eZSBeXd8f4mFe3KDlIpqgI6FgHqbgnuPgY2jb4CBhYl6i5OLeI6CenVse3uTf4x1gXt6jIOCe4R+lF2AfmeWgn6Ljn2FeJeBfn+Aholvf357jniOcpV2eop6dXqFeoyUgH2BgX+Sb399gIh5iWmLeGOaeneHgnuRfJF9gX96h4OIeHp7jIJ+f2aPdmx7gnl7fI6CfIqCf4N3foB4hnuHeIl6hYd7dXqJfod3jnqAeHyJg5V3gnuGcHh/bI58eHuCe4N5lISHg4GIeHSAgH2Keoxthn2GgXp3hYJ7hXqMfYF9eYR5mYiGfohvf4FykZWEgIB7g3o=","135.7|k3tiuqq6a36ynF1irXVpeGRuoKhnpmR0SnR7RGwooJBe65loX8GIVH26smr8a2GCoo2SgUOboqSVjnmhhoOnZ2SXaouMnoS8Y3ezeHhFba2ptHmxfJZsWsNql5Jt1npx0Hp+jI8VoLN14XuWV4eltYB+iaV+a490bIZjq5Ssd5ePimS8l317caiFkpGOipF6pHWjWnV1mqKKz7KWY4KkXqG/aIyofYOmp4Njhmtakqh6i3SMieKTe5CcpHmmkY9+oHufdY9ycVWj6GyAjYNqiZOggK2HoLOAjKKelnR4apCXjM2qdYh+jJaTmoWdlKeXoJGGeLR2g2l2oZqacK6SnGGfgo6Nf3dgol+phr+0SHRteJCRbqV2ipG8kq9h3HqNppSZm556r2qNdY6JhX6yioGHrIp6g5i2ms6FpY6lerd6enF4d4eOYol4qmeHc4aJnWaHmmeCj6+Nf4N1ZIZ5dn+Cf3WdiHWKi4+Ko4aZiox8l3qAeHl6iZxOl4WEcXiEb3yic5KTZJ2KiYZnenV4g3V5ooKBoYeGcnmDjKikhZxrpX2gkWZweXuEtVOenH91gpxyf493fJV+iIWQh4F4hHuDdWiqgX9iqYZsd5uDhX6CmoqIeIxfe3eLgohinn9/m4qEd3WEiJK3gpyBiHuJe4d8eXmHllWYq4RtkIV1eXpNgI5dbIiDh3eCd26HhE+Xgn+GhYZ2Y4OIeJGFm4CUe4Z0g3p7i4abXoihfXRsoWt0d3l+hFt0hYmBX39xcoBxVJaAfniWhXJ5gZR+i4GZiYd/oH18fnt8iI9/k4mQcHCbf4F8eXOabnB8iYM=","139.2|iaGvgr62dYVATpiTtIqfk5qJqnNweK10mHN5r7+lbJpjmWLGjniNra63Q665YZHTnp0ymeIotKOJKYtDz52zs4I2mIyLcpmieXSteky0uqZtyYahebOba8+Iu21fbJK6g5OBjtKKsqiME5JUvnmsfn96h3GLgHh1c4xemqOOr7dmacgYmqWAmEJ7i3aXvpJ4jXmpoKDLbeCRon1xqgCbo5OWipGhZ7DFjnZ4iZ2OnIxlh4FdrHSaZKu7jaDqdpyOjXque4eHkoRukHixhpiYkvSSdYKVjWSBl6CRmZqToIShq5mBhXB2dplLsp6odcd3sZ15eox7aY6gr3SDcJUZiqMtjHRqbZtOP5y7qEi7M4+ZYpeaQX2HaKalmAVYXIGFjHinnnt2h2CDjnaQq2qBcnqFdIxsmKVylKh7tHdfe61/VIqPuX18XpuVg5BinH2rnriIUZ2LpWNpj4CNWpCfuIN2fIBnhmaYqWhb1HuqeXt7jn9Zh4eWe45Hg1SmkICAin2Qh5ZXjIWQjotwg4xsjqJcnHl+dGqHZESNbVatfKd0s3rCaX6Mjph7rEykeqGJd9KLg4+JiZl6got3i2uGlXKKjmdOeH15VoZhf6hxZo15oqt6fph3hYmLh6NQXHp7g3GDZ3aKa264fapge3ikfGyDjY16mkubVaSNZoKIeX+Eil2egYp2iWSCiWaJi31pfHyjeoRrboxyYZB9ooN1eqV/R4OFhXqcWrJRnYyBoYl+h3+JdZ2IiXqKbX+gb4egnGF5fqBuhF9uiVJihH2hioR/lnZhgYWJfpSApVKfinmelYSPe12ClYaHeYU=","146.2|aqxPfmGhP0jEU3mKuH5zo4CRg1eFjZO/g9KpzU/eortzq32q8CatxZG0aqu4u42ErKAxaUO/Zbi7yLhPzHWwmnqxt+ZzW5qjabddru3LU7Clv5KheKG0SjmpqYCBkpeJlX1/Qnm1arib/apa44CwqX+BdleZYGCynGmrkWuHmJydZ5+tm56pj4C0hGeb3LGjp7GapGeRm4SYmpyyjn2TsquErKeX3NmNtMKlW2y7b5XHwr9rsqSXa7uZm7Vta6GIUJSxn5GQZ5mjwH6Ceoidh1SOn5OUqFymrYyYn7CJZYtxjGW6snK0pJpwobqlqoBoq7w6k2Wuu5hopJqJdaE1ZJk+vqOozp7MjpyWT5Nub6FvinKbzcSpcIOYm5GgbsibXmiml16Rm4JecqN1rqqkjHu2jYlvc2t+rYF3qYNUiniYj45vd4eLan+WdJdkpbaoqW+kh52eeKmUt3FzSXh6d4aJfqCOjGWsl37FZnmhpWuMkY7LhnWahbpWomyai3a5l4CThGqGpXiZj5BVhXRTdm/BoYWAr5SLgbNqe2JMdp2JZoyQmdKOcZ2Enlt+ap2JgFqRk8eAqYOwon2TjYGEgJ15gJ66g3y2lIhnWnqArqR3nnlqkpBkgnaUfIPTl4WApIOKZ3dteHlBe55/a46YkamAc4aGnF1oZ5+SbqWMdayLoISinn+kind3eGV6iKCghn+iiIZqem1+knh3lntuh5WZvIR2rISgZlJel4xrWJd8pGqZgJ+NgYyQbnuWb3lsqKCDe6CFh1+Jb3WhbXqVdm2UfZOagXiNg5CAVkeYi2tbjnGebI1mmZyDjIg=","138.3|rXSpiEdboK42m62aomumo7OAg2CKj6aMj6qEXbIBmnOXeo2NPza7iZNnPatvNYWScXF9nMfOUVfdM2al0meipKFLQnuVZmiwRYqvk1ZaqmydhHN0fMZtP8KHY6NmjHqOqXt/s6ykUWR5CXCXnXKfhn+AkmFwl1yJ5pNgeVyHqqJdjO4cka2MlzqzlXFoonWGZJaIZZZfledvhWxYhBdjipCdsYJqRYueho2On5eOZItxd12Og3ORn4Oio36qcGbCXICBkL12kFGbe4aDpIp4fNeBp5SXcnR1gZmMY4eElXphkoKWZIl3hI+PsW+Ni6ttUbgpgX2Shm+ZepaOjoNvdX1+knaXZrFjSYqg4nWQWXOOmWqFaYVljLRjkaC1XVmOpW5Zr1CDimObiYFxQn6BbYCkRYedx3CLfY57Ubp9f4+LiXaMh4N+lnKWoHNflHiHecdqUYRQl5dvUomPmnGCoZtzgo1aipqUiGJ5y3pdj2WDYYZgd4hkhHCuhXaTfo2Bg5WLpHJcbnaFh3J7f4yccY9hjXiCgWGFiXduaYe3fF6lfoB8lGx1i1+Glap9VpJ7ccaBjWKZgoFvbH+VdHV+gH91hVpLeICYTIWjn4JqjZB5YZpkgICAfoeJdG5raHmAmW+EmZd3aXW7fFqxZ4NZjU19inKGeKaIWIt0aYCCkk+DlWR6an6Icn6EhI15h21jeH+RcoOXinRxeYN6YJd5f4uOU3uFdoWDnaRimHZso3iOXJWVcntzeIlzkYSPh3mJlmB8gJFfg6l8el1+lXlhoWmDcItcf4Rwh3l9n2+md2ihgoZkmlCGh3N4jHI=","132.7|jmDEYYR3zMKge5CigcO5r8KYfHdwc6iHdFPZnYrmeqZreHCbjYqUu4t4dWlyvctweWbbXDVwhHudRXR2VZl+ZXuMrXmGfoVvhoiIZYicjHl1tYB0fkBwoZCfiFZyd5Z+YXyAUYpmg32LO2t5QYN9cX5+g3mFcZWKpXByV4dUr6ySfHJ+goygpJTnnHuJhvyGg2aflIeKemaIYpaPbNyQq4dZdbdpvHBpgqxhZmmDh2qHjYR9rbmDjp2esZyGf4hTg4SdbpeHiqF3s3dVioBylYumdmiSfIizgINmbnFrZm+AW7aLe4COlIKYl6aak3d7kmqyhoRloomDf3aheGKSdXCvi4WJoYSTqYmWd5Z5pHlqe4NmpWmBfqRqgYeGWp+8n32LdqCFprBrdYCDeYmJin94fIGIdJKOnoB8lHHQg5lwi4OBan6OcllpYIWMoJKOeIaRoYWNcoR8jHVxaoVZqFmGfXOEgI2pb4iNa32NdY+EgnV8g4OSfaNicn1beoCCmZNzfJibkIiEaXmSenRrfVaHbIZ9VYeAmIV8hZx9fY9yoIKBbpOHgJR+q2VbcGt7gpuNiZqTm2mLlol1dZB7eIqDZJ1jhH5pi36MgYyJhIJ+j36OfnyQe3Vvg1eGV4R/UIOCiYF4haVvfpBnjYWBdX2BgYZ8lmVWd1t/goiNiKWWj5WNkYl7d4Z8eniCbJFxg31YgX6LeHqCgIB+jW2Bgm9ufYJ+iX2Sa0qAa3+KhY+FnXl/hYyEgnx1jXp2e4FbkXCCfmyKgZSFeol4iHuPbY5+fnKCfoSJeY+AY4tYfY2Kk3+Sfnh8hYyEe3Y=","138.9|YqOR2WbHgaMxaXpyXoOXimGBf2Sdr3RohUGNwmF0aHGmu19Qef2gRGC1SJ2wyDexu3lmpafbabRcPIZjjHhnf4CNjoiRZHqGTGunYLW+ZLlrRIe3f2CZpJ1wqpt5q3CZr3N+rbKLabd1eZVtOXdmeH+Cj2eCr2dqsI+aum3HrHJcdmutbHJyebNDj210nlVsXVqCqG+qb4h+sJdqpFKqVqOye3itVjiVjJZjm5B0b6uUhnx3nlBvVXSVe46GdGykhnCPYZ6Nb31q2Jahi6ealX6Zn52Gr7OEjYqdbnCdkJJ0tKCagHl7a2+UmYSkpp1wWnpid5BgvJduqHKOlpvCfKFtmIOUSoxdwIyitaWGQ46Nr3KXhod9doRWcaVo52iRinFjo1d1k0SQiYp1lm2cbH6FpnVdsYa8or14UbKHdnNtjZF1lHuCoJySgIOVr6R6gIN6r4xHoo+vVYeHl3efcK5ygW1qdWJ/opmvuXhdmnB4eG/AhniHeYm3hZt2kaqgb5mRcoCnjalxkXZ8iIeTeYKKfXSBd253cr+Kjpu0e1qLY3htaG+OeI55k7GNqYaIgH5xgVaPlo6qdouCdlWHhXd8kG13eHyKWHZcppmPtJ56YoZxe3Bvh4qIeJqLnnuAZmp5Zo6Njbrcely/bXZgcISBdoV5ZbCTuHCCj55yh2poiJ+SbIpzdl6Eg4h8hFd3dX9tbXppk4uHrJ19Y5F8eW90vYF9dnluo4GxjIKLlm51YIqFhpJvjIJ5Y4OAiX2CP3l8foZofFiQh5Sdlnpflm54cnGif3aFe2+CnZ1rhYuNdIFpi2yLg2yJgHw=","133.8|ant3uWidnXHRlXiArGd6qHCCa2mUuIlqeb2aorM9Z2GdqYGHhsSViYaDnJOVDxqvhmpSbT1rao2Z24eXMqSnjpD9VYWPbHWBn2qaoGWhqodmSYOgf4F3SpePhI6PuYSbqFeAa7w8bJJu6H+Qw4CjhHyCjWx9f29sonGWqHG1kZCljpiLlYKKxVaRgXFukoJyYKKGk5dxa6t5nKZ+YDqPi5Sseoylo11tgpqEcmxOcZSan4SRmHuSU5Saf3ykdGylgXd9mJWJkmxlm5CCaHpqhJZ8pp9yktGMn66IZnlwbZpyfpmSh4eckpSPnoeOpatyXJFIeX+ghIuWdmyKkZyTiWNmr42bWWubv15+kq+AKXtygXKFVquDiIxqlJOB3mOFlXJjgmV5h0V1c312iJyfkoCHs4ZWp36ZsbF5VqyZd3SOU4WNcnuOm6GGZnRpwnSFeFbJsFtQo35yaHt3oHmAt62JfYKIhWSEfmlrwHpieXN5hYuvh4hsen6wfJ56b5WchoWKfaKnV5KkhHhyenmfe4WZvYeAn26HaX6Jcoe8eGKFjHqHinuKjGl5ia6drGB3gZuDgFRukJB9aJF3cmp4iHJ6gZKrhn+djIhhjIxsj555ZYRzeHlVenZ6epmjwISCl3+EZX+Rc+TCfmO1dHl3i1aCinR5ZKilqnZ3c5mEhG1HtqJTZpJldGt+fJR8e5SYhX16fIFjg4h4jo19ZIpve32SboGFZHpyo4uTXXtwjoB8Y1S6iFRxk3t2WX58i3t6o5qDgWSDhVhwi26RlH1ki3Z4dotgfoRzeG+AmIZ3dm2NdoVqVo2iZ2qQd3w=","132.8|mG6uclSEn6akmZGlZr6rg668fIlobI6bk1Gpj5eShJxii5KsW8NenJOeMLCaonJWoZLeer/AWZyFNnSfQXxopX9McY+PiX8YophBZ6aOlJx+OnmIfG9orkOAoTaFcIRshG2BiUXjXZKfaHaVmIdqI398i4V6lJSVeX/9emh6pouNjmqWdJKsnKaIloaFnbeUeWWWhIqTh0KDg36dYZCblHV9lqZ66J17i5+uh5O3bIG2XnKVjYZ0k5mThpSLhotSj4mGbJ6DjXx+YWyJpIdpo2aAfoCfkkKQpmyLlI92kndml6J1doidknaakcGqg4uDkGHCiH1nlIOKmn6GcoC4nV/Fmq9mn42mQ3aZgV5un3WOjG+XxIdzjYh8dTy7pYx4sIONg5iId42Mhot0e4ldhYB8uniPbMXAkbOBlUq2h4VwjYKGlH9lbGqLaGyOfnt1lYKWU3amipBupIKOYnWKmm6CgaGVeoOhh46onYGRZpKEfnSQgISKgmtckpKEb4GWhoyDkG5ZjJlkiIh+e4lkdomrd4CAkoN9n5GRiXGAgpBth4eJWbd9hZGBdV9xp3FynGKFaaN0oH5xkGyNi397h4Z5hcZzfn91nHiJg5uHbpiAkYiRiYR9eYeOeHGbeH5/fot8hYOHiJy6gZBWjYWJdZWChYiAYl9oo4BuiYyFfoCDel52kG6lh4GAg254ibF3g398hH2AdYiJc5mBkn2Ag3hsh36Cl4FlZoGcbXWPXo13i1t8dHmIboiJdICJcnmLpnp+gnKSf4iNhJxsjoCRhJKGiHGXfoOEfmiAa41wdZBfjX+FXZtld45vh4Y=","131.5|fZfXfWlt4+O1lrqtY73y7dKuuW6Hw9Ct01XqmH6/WMd6Vq3RweO9ptBrWnwsMK6ZcXz9ck+mbHK2X6CYOqFmfohrQZaHcZm4Sqixa7GXfHJStZFwhIGZqq6YeJtta5SRUoR+WbKAbHOCm5iVn4RqtX+BiHCWmGak9XCKd29/p9mUio3UcMPHlmHNvnSZyuCbkWXVjn2VYtuXW629ht3inMJqxK92uXTFYc1ybHFzdHKhzKWQva5zg8+zscySdZy8qo21a7GGe59W44KB05iPp8HCrG+0o5uyrqV6eKqCcXpzhbOxnYbWoXKgzN+vw7p3oadri51ov4l+f1+wfm6ae4zNlrqwcpuzpWWgrH2Qn5Jxn3N3WK6ajK+SdNix2JqusXigu2aHn7hqeYJ1eoSwioCsk3qBrn+ym7t7oJ2Uin5wtIV/hHWocYCLZ46eqa2dYoCHommLnHWgu3l2oHeDd6uGf3OUd4bCjnCpmnuWsm2Io3KZg32Pdrpie4KEhKGVj5V6momebcGHeHmPhHmWe36Ym4WAhYl6i5J+ctKefJmYlYeCY4uJfZV4wF95nGWDmKKJm1+rmnSTmpBweJiDgoh6in6Kgn9nmnl/l5tvw6Z8l6JtjIqAgnd6e3t+ioR/f4p6g3+FdJiQe5iXbYqKcZKAfYZ1lWF7mIGJlo6Ih3hziJtegZFzeId8eZB7eVuCgoCBhnuDkX94oJJ9lINthoNyq4F/fHiaaHGJX4ePmo6EdG94iF+Bi3p7gniKjHp6WoWAfWiSe4R2gX2Qh3qWhXGQfnGYfH+GdZCDgJB9g4uXiIZ0c2x/a3uIdns=","138|pl1qw2S0bHs9T2VorYFpR4iKfVGeeXethUKdr7IAobCmzVl6TZB6zXKZg3XmbRUlnI9fflVbaqFoNl5GgVGoj4ScWKlwVYF7babDW2uxrKKlSY24fZNpsMaqkJFk3aFU1rSClWw3ap5yImFTqHyndYCAdFWFkYincohUwG3HfZhiaEihlmuPc0tnVGZ5b4aacFVnn5RumHx9yl9Me5GbuHzMmX2znp17oZNhi25ZcbJzhmhdoViVY4NVbq1ManOSc5B3ZZiIkkqiipaFZGV9jKyYhL9/dt18lT2gj2iBbatziXduYm98fZNJiYNte2NjbmCsjX9feI6aiJtgjbJbcX1jg4laV4RvvJKGgcWvkm5vZnOZLj9haHNpkIWMhHqEXWRygI2La6KSdIB1k3Zgb317cYhkjnBbg4h2ZIOKiF1pd4iOeIZ2lqpyaXWhu5pznJuGsJGfb4ubfYR1dHiAkbp0fUWJiGWig25sdHdrUoWLinF4hIdmh4WmkVqOhZp+nmqacG6llrxIlIdue3iOeotqQ3d+aY2IT3OCcHw7d2djt4ZyWlaLiWOEcKariXZ/jrqRXXGakKiJhGiJiHd+dWF6el9ad4F4cohOfHZ0jHV3a5+GjnyReXSFeax+XHx9coqEaYF9b6GKd2ubiIaXcmaCiXKHaqe4hJB4kXqPbG7lpqCNqm55hHaCeXp8iGdqe36KhIJslXx4o3t2bIB4gn1kc4OBc4Vwm5t2cneLqJlwYpeQio2RbYWIbIBleXuBcmp/fnN8hVtzgHOTb3ZqfYeLbHBpgIZ0h3d+mWmKe46emIFzk1epjZ1xhYE=","128.6|mYJ9V51JkG+3iHKCmoRlfICElYmJgH9jeoSSmGBYZ26US4ppjYRyioBazF5IqYGiZ5JhejLKmGJg2ImDnZmYZZB9xm6PhG9xpGRQgleVYV9kSHtWfmN9Z093W5mKSIGSaJV+b4L8lVqFnoaFUHWXiX17jIl5c5Fmj3eOXY9yrpGYhW9hi4mMhmB3ZoJwm2Rtf4NujW5hbIJyYnRvcGN0hYJjgIlcaX5lb3aTdmirim58aIqFgkmMbIqJfW+Sgm1ygXWRgX6EcnNmMoh4Wnlzh4B+c2t0gkWNmm9xk3p1Y2mOhISQioFghIl3e3CMdG2GYnGSdJx/dIhvZGuFimyDf3BXeHp2eYWWW6F/d1RukYBqm4p4ln+KgX5lij1dj3R0joRmepFzdXd4cnuEZ4aNjH5kfoF4hpOHeluBX3uWd3yAaYR2eHlqj3d2gH9zkoaNZZmBZJmBeIpyYX10n4aFl2WGf3xshXCAhHV4gYBmcZB2a36LgnpveVKidIpueYd4gI1of3dql4uFe4aXfXOGhYJ8hIR/cICEdYCDdlmPgWaHgniFioqHeG16a59kaod5gmaAhWWAh2+Cf5SMh3h9eoaEgqSQhH+DXIVwhZJ9Zad+aGyNeXSJfHF9gnmHhoF/cnaCdYWBeZB+f2R7kHZ6fGeAeHp3Z5xuaW57cXx/iWOlfG2ij5GTiIF9eJCCfaqHhYJxdIJziIJ5ZYeAaH6LeHd/Wn96dnthmXd2jHp9ZICCbpaFeqSDjYaGiX2UioCKpIeBf4ZsgW2HfXJkkIBqgYl4eIRsf3x2em99aoZze3hmkH5qj4piko2PhIY=","129.9|WI54l3erdYu5dYKQeJF/ho+fpHellpahia6Zrah5dbOkoaeUnpm5UJGn/ZyvXLSUnI54flgfd6GjzZJyh490fW/7hb92eI+3npywlr6oo595s5Sbf5iNi6xupKJvkHeAoaR9bqWOeJmIo45zfYF1u36CeXeRbpicc3p5pXiekaafeYKseJiajZOOpHiJrbCSo5ixlJWYd4yOo6ejfL6lWp6inqGkj6Skla2YdHSSe56gpI16ls55b6CPmqeBeYWMo4uYkp+Jkn13y5mpgJ19o6aloZuSqXa3oZ2YlaR+cZZ8nqypjnyChHqLo4uar5p5eJ+miqGXrI6VlHqIk59ppXt1r5iahIWWVWO2gWyonYlzXXuVhZ2OepeCerFVgLqZdnl+oaeKqa11eYR6l4SvkHqZfX1wgYeDl5x7cJSnhpiMqYeNm3yPk5qIpIKWdpSQnIR7XGubfW2umnt3bnqYg5qKfn+FfHGdfoeyfH90nI2GnYmghIZ9e8GcjoCFd4qobneWdYZjbaSkloiHgnl7fp2RkYh/oH58e452iJpgenVrsYSPp4uHiX5+mpekeYl6e55vjJCYl5d/p4VxiJOAf318j3mShX+HjHthfo+Co498dXuRiIKRgXaQeZyNeoV9mYN9b3d0hHpvfHaVkIORh6GEiH59k5ageYiBj5ZyeHuxhGdkmoh4h4h9fHR8kWOOhH+HgX9xfXmEkXx8dHOWg3eOqIOEenybkap+h4N8lm55f5aGdmWMh3eHf3x6dX6bZYiBfoOAfGV4d4+Ocn52douIiY2UgoJ9fY6BpIKOfoCQeXqLlWaKcJGGeoQ=","125.4|vYiqg4qFhZmLg7yzZKWju5OtnpVtmauGwZnCYHMAlq5ok7mRpOt/pNCCyIqqOtqiioqVebiUiYm9zoyHlZNmpmzEdomFkn6BsoNzjmpgdoiZbXl/e6GOk2+Vb5KPiIyamox9bIaOiYFyp4qEjYVnj36AhJR6hIGHk3nFj4mYppaKf7ugcbCinG11m4yEsL6CrJCma3lmkLmCoJ6airK0mZ2NvZCBm5rFiaKaco97hpCom4+Bh4NxmI6joqSvioerl4GSipt3ekaYnnNzi3WFpZqjjYuWtJJ+sKaJi5aAkXuDhHmxjH97hXJ7moiVkKeLkJ+NgqiMk3N2dZOcdIdKkImTcaSiWYSysGyZh5R/rYeLdYaBe5CJgZakdZOKu6qLi4yMloOEkYd0h3+EjpyXhH+IoHiTeY+el5qElJCZgoWIi3h6eISIcItjjouDfJeIh3ebqXWlk51/fHqHbIKDc5+CfrCOeYuYoXWRi4KOe4OBlIabent3g41giW6AhJdzi2l8oIWjcamXhIRygYZugXeXjoKAnIl4gZKKdWqPgpGJh4CimHl3eniEjWF7f4WAimiHgHGRgIiVj3yOhHyAiW2Cd36QgoCLmHmVb6hziZ6Dj4uBf4R9g4iDhJeSjoB/m4d9iW2Hd3uAgY+VgIKOhn19enuEeWOBd4GHeHSGd3KMi6BvhX2UhXZ7hnWBf4uJgoCAiHyGd4Z7jI6CjHyDf4GGfHx9gIJ9aHRtgYaHdoV6a4mGiWyFgIiFaXyPd4GDg4mAfoOPe4tzhGyNhYKNhoB/f4Rzfn17hXd9Z1+RhYN4in1wi5p6eYSAiIE=","129.5|unOinZuvdJ9dpYOBWYGNeYBzaJeCj31pfkq0SVg3lKWN1npInTeTRXmvS8L80nlGp4eoZZ2JmKZYVXupfDBeoHxrcLSJkmmpRWemYaNIXKaXfHafgUuIiJ9ml6hstm1UwqOCU2Zxl6KKXnWdMXRinn2CipVygmRujXRomJKmn5R0kXCObJ6EQ56pio1rfWFznF5+X21+kH5xw3ZkjoSLVZS6gYWZXnCLpa5hZ4WHj6+QjYiVgGFsnnSAiayKimlyYnmNaYpycF2Su4OFfXWRhXR9kaSHlph/i2udhIR9h4yOknlugIprh26VhIOMaYaNYHpVeIxknGxomI5riJ68Q5KYuWuKfJtloZyggamVooGHcoiOoWaDkGGTbdN3hXqvnYxhkVl7iX1qgY6IiY+EeIFrXHmcjY+MjJSFXZ5+eolumnJzfoOAkYh5aY6VnHh4oqNplp2od6CkhHaBZ4eBjId9gFJod5CWbI+WioJlfGZ7hnKQd3d8g4uflZRji5GmaI2ck2yQoJpqkIF5f4NyhnSJcX5/Q4N2kqRoial+g2Vyd3qRZIJzdn2BkaGEe3WHfZ9zeo2bjo+ZkWiNhoGAfXuEfHpvfICJVXeJkIOLhJKDanZreIWNf4GPhIyHbn+ASnJ5kJZziKWWgmanaXqIc4V6dnuEfJ2IiGONi5dyg3u9hYymkW2Lgn97fm2EjXNxfX1kcXuPgnOFl3+AZ4JwfoNujnt4hYN7l3udfoh9kGx/dZKWhKKHaoiFjnyDc4F8hnl/gHVle5OHdpqLi4Nogmp2jHN+fXh+hH5+hp9nh3+LaYB+ll2Ik45sh4M=","129.1|hHJqgad1cnG+YXiCaHpvYnmEfG+Tg4pnjp+olqaQkWmZb4aIiLudrIZ0/ZBXbnWMd5Zya69loHijxIJZdXluc3mSmW2RcHyPpmqhjXeYpHWVUoZ6fnJ2iriQfa16epORjqd7ZZDBnHF6gHljqXhvmX9+jXKAkZNsjXKEhpWMloWbb45+cn+DgGE7gXJ3qYJya5GUk5FzjJd5dG51Zlp8m42AnIGHX3SDg52Mb4ySkYZxb4NnmlNzdYyDjn2YeHOianSOjYaCjI6VTY6VfI5tm7iLiZKEfWyIhXB/k4JwjY+UgYSThXaHgnR9hJSciXh3bIKgdoCNcomTbo9+h4Fhf2prfZBviXaGY46Di3OogXuLho2JYXSBbYBhdmFol2mKkXdxjZFzb3tziHyIfHKejXuCc3p3mYqXdX57ZobFemaFmIeLgIFykZKKZXqFoZuOdYR8aYp0imedbnqEp4aJjZKKf4Zud3OAc3RtjHtujJB4b4ONgYNthG2fcnh8dZqDlI18bpVtiZVuiIeCeoOXiJxpeIR/e355eH16d2OZfGyPpXl8fW+Gh2eCiZ+DdoR3dJ2Gh26Vf3l7g4Ryim55foSFkHWEg31/ZXlsdZB4ip99a5CNeXyOe4SAhY5wlIN/fXZ4dXJ4d3ibe2yMjHl0g3mAiHqDapuNb3t6fYSGi3iThG+Oin9wiXN+gpeFgG6GhH98d3t0f3p3boZ8bYR/e32IgIGDaYFvlJZ4hHqEnIuBc41yeY2CfneKeXt3j4GTXYKAf4Ruem5zfG1tk3luh4l5bYePfIVyg3B+f3pzeoKTi4SAiHR9h4aAdYc=","128.7|hJKBfmqDiJSVbJiNnoOBi3l9ap6cX2eSkUppaKnOkmSfeI9/uMJpboeFf59vO4hyioSGa6FAa454fJVvg3SdkH6fMpJ+m4Bik4uKYpJop4aZXouDgpuYo3l+mXiSfHp0kJd9WGb9bXt6b45xY4Oab4CBgaCFiHmKlnC4iHCDdImHdZCdjouCnmxyj459b3iGZV+XcpR4kHl/d5+Bit+bdIKEfYaOc16DloilaYXKc5OhfZ13c3COc2aMcHhtkHp9j4FvaJ13j6qWkJCddZSQflSclZmEelqHfJKLhoaBiZ5yhnmQl3iEcIyHfmt2iImRbHJ/fXphkHmXco+TjoOAoZGMkYt1vYOYYWBsaXaGu4+DeXKSiX6TephQjIx3lIp/f5FwgHiAeq1pgo92hpJrg36droN3gHqTh5WFanqBfmRtgHiKeYWOkoiQmo2OaJx8jn6UaGZfhGiJfnWCnHmKcpKCfKSJg3OJoHaph4NwdXqAbnKPe4RthYiehoJ/hpKReHiGgo1qa4h+lYSegIORe5iYaYB/ineFfI+MeHuKhmt2cH5lfYJ5iWuBhJ17hYOHhm98c5GChX59fHhvhZWBfpV4nIV9gHyKjodwgJJ2k4GCbm58hH6XgoGMeYSbgYF9hIODdXKOeoOZgm6KeX9bdHt7iXmCcpt1fYCMhYh+gZF1gWtjeHh8gpV8f5J4jH96f35/g4J1kYh8loiCcH2Gf3JsmnuDcoGAlIZ9gomKf3Z8k4uHeWF0eXeDl3qHinyNen5+f3yLgW11h4GPiIRygXmFZHOMf4R1g3V/cpiOhot8d4CRiZhxanV1dYI=","126.1|mJmnYqJmdqCRX52Xl5CWkoaZkZaWoJGQlqZ+nVz9i56ZZXx/f4WYVJFlwLlSl5psa3Q1mb5umnBg2JJZkFyWlnSPlXyGlIPDoY1xlJycYWiOo4pofm+KhnhmeLN/dGxwX36AmWx+mGiWlZdhYnWVvX17hZeHiX+KXYaCWpBXxp6HcItejqGLnJttmYt8yHmGh5jek210iaB+T46NhHiRYahal5pnT3OOfn+djZSPj22UkoBqeYOLXHqgkrGPin2dhoCdj4aFc7SNkY5fV5aBqY+OkWymrIKRu5JocK+IlHmQV5eWinRYgo1yjJSxfpmOeKh9f5+TgIlubIl/hmFjnIFCo417tJiBnIKufZN5goaPhYtnnJaIb4J7i0U0iJ+Jco55qIZ/kXqJioWHaHetgn1waoRjd6B6g3mFc4+Gf6GLlIR3YYJzjFp6hXt/eIabcZ2Bl4Vxe3aIlIaIkIZamYCCfYNphGqGhYqTiYJ3tIGBg4iqg3l9gJKXcIR5fqSdcHh0jpeRf5eKb3qHhIeFhluRr4F8e3WHfX2Hh2F/gnOUin+Tlb6Hd36BjZRcc4x+e4t1e5OdmGKEhnFue36AiZeCb46IgX+OYoNjepSIdLiCc32Ag32OgYd1hFSOlYF/dHOCan6Dhnd1gnOGgIGJh5mBeHyCj5VXYXZ8eZd4eZ+Td42Li3V0e3yBhIuEcpeJgX53doJxcYaEb4mBdYCHf36LiIJ9e4KKkE5vj32GfnF4lo6LhYqBd3R6iIGmh4FcnIV/fYprgmKBgoJrhIFyh3qEkYqQfXp+gYt9ZX18f399d3uSiXt5goh1dXw=","123|joCHZWtfZoZplIqYkX2LgoCJUp1yaJmYcKiol5yCcJV9cot0XHqAjIVvc69phIiDe4+glLqMbnOOkXaXa4KQl257gZuFmGpSoJVolZuXl3BxWWtrfnZ2gmt/eWGAa4OGj3WAp3n8bGiWoX+QbYePW4B8hJxtgHqTX4+RbHBzkohvjI6GhoSIe512iI1sm4aMmpegjoxsc2drc3mKfGV/h319hIVul5h+j46JlZC6dISPZ3GMd6WGhnuFfYuVjG5oZIdyj3uGiIZxW3eOfl94jZRkk4mAglGSkoqFkYiCk390goh8c4RwjYaOhHWEdISRa3eBhXuVdIeOa3VwfHZ6fniTm5FvqHV+WWuIfWmDeHmNh3aCo5F0iXmPhmNufotzkpBpfXOFe26Sh4h4aXh8eH97e4KGZ3+LmI2Ga3h6hIiJhYWFeXtnhHRih3J1a2N1gHF+YG+eh4VyeYeJknqFh3Z6f5WMgH2CZ4qIhYNydXuDhYiFg4RxfHiMgol5fH6Vf3x8fG1neX6Vi4ZlgIWEeoaAlnt/l4CBlHdwiGV9hG91i4GRnqKGiGx9do1ofnd8gHeEgYhxjXJzjnyGh3l/hY95j5mNen13oIGHcYaEaI6Db4J8hXxufoeHenONhXx+j4aAe3l1h4mJg3F5fYSJiJOAh3l7b4xrj3h0eYiCf353d2twiHyShXiCgo19hZSKeX53hoB8anaFdH+EcX6BgXOOhoCAd3txjHuJeneDcIB8gWyAeXGHe4KGaoR9h3yGnId8gHeQgX99eYp4goJxgYKGhYmMf4F1e3J6bnd8eX90fXuBbY1rc4l7gYM=","139.1|UICmr2uxxLS5hbOtaaKysZaanmmke5Rvjq+hr2uxlJiiormultu1tqKyoYGRAV+opXF4dDcub63Yfo1+poVqmXvFTpdqboNjaXK0mYupbqqVRpKmfcF+Urygt4JmmJmWvXmBba/obaaBboaEkH9sbX9/amyHdoZwtHNmyHTCtLukgouOcWeK01aEoXKBra5yk56Qk3GQk7aMqbSsaVKoraW+gJLIvJuksJytdWW6c8GSUoqDrqRwjWailnGJcXt2uXdllNuLdJ6RhZjkx5RwmM+uyMCMjWmlhqa5bJZ3ZcZ1tciMi4GUoXOei555nJNyZ5xxdq2XjI10jY94mLuGq26DpJ+uopOwQFl7uGuZV4FnbHe0X6KJgNl9dcWJnmyla3FtlIB6qnRzcpx4p4NxkoGsqHmGjXRuvJJ8Yo2hep+NgoV5lYFkmcCJrnyCr5ibopqLUGNvm2mHiXpxoHu1qIGPfpGPd4d9o2utjnhob4N5kImXhXluhXGlnZKKdoiYl3uvjGdUYXyStnV8fG+jesiIkYaAtX53dliRcJyEeG12sHhzp3CGfGiCYqC1lY14nL+MmH+AjqFydJVsd3F9iZV4wXt7hoCMi3uEgYNohmx7cZiDeYJrfXCje7WVc4Z/qYp6inKMcsiUfWqUf3h5iXOEe3mGZaCznYh6h5GKhXtqnlhaY5R1dnd8epN8nnGBhYCNgXeHfot1g3x6cIGPeoKLgYJ8a4N1m8GPiXtrpY6If42YcF50jXF0bHx6i3qqhHqEf4h/fIltiXmOaX1whYZ8hot9gXt2gW6EqICkfHOcmZCLjVyFaWeLc3s=","140.5|mGjnMURmvKXLlcK8na3n0aiip4ONnrFknL+Ef0v8lJyXQIy8nXSXmrJwSYtVeISNb4B1VZkPTnZlVX+YgHSbgJ8Xh4SNh2mvbGZgnqt8U2+Vu3VYgFd4gGmBfZZqH4WJM5iCRn2zU2ajDnaSUW6Zm4B9jYRujWhtgWiVVV4/zpqiiYRNkLSikGCMtoJm9H1ysKWcdmeik8hsSYyrY3yYkpxFo5RgWIapaH+WXIScZmCeZI6LhouMaZS8sZi5hWaFkXacmaJ8bqqYeomDgp9tsKCMhUWVmjeXo5tqgbhlhWdjd6qFi4RxgIyXr6SceLd/UrJeeauejXtjeY6Hi1mnj2ZegpGjkKGVR46qiCptV3mFWGlrhm6Hi5eSjBFVe3x+m4FasWN5koNngnFxmlKRkX9wX4dzpJ6NmIKBUIRRe7KSgH5vloNlnXGBfICLhoqZfLxOU4OLlUuMlnKCW3CIh2GMgHBiiHGkg3OblH9Zw3B6kY96fXechXW0daNoc4aFiotoi2BafXSTd4KMeIJbcoaYkIl+e2WJiX+CeY6pf1ibY3ycnKp5daKGqa5tg4F4gICGmpycnWp3hYpmgIB4jX10gKFRhX5xWIhmmJx+YaCCXY1udoCLeYJ5cn2FRoZ9c3CBdJKHdpN3flh5b3mWjqJ9cY+ClaljdWd/h36Fg52WZ16NfIp/g319gGp2gI5oiH5nb390l4V4dox/XYN4foqYiHx5hIKMoXyGi32PcYaEoZRpd4mGgHGCkXi1b3uIg2eGfYJhgmeIhnZfi39fi2x2nI6ZfXuMgo59a6FsfX9uk36ak11gf4B+bYM=","130.8|fYl1hWl9i3J0mm5rZ21xe5OHkp+XkItogUiaf2dtjIKNgp96qoF5OIuLg3WG/YuwhWejdDX4a4R6fYmhp8JoX5N5wm2Ul5ZQrmxJX4V8aImJTZiEf4OStEVbgHGUgGKQe4SAYZFybIyLMIeXhIhrXIN8kp6SiYhuiHS9d3B9mFh9iZOecKGZfpuBkY+ShnJwbl5peHKMinGYf5qikc50TYR8p4p4a3VpfnucbGh+cnmNgpOOmHxzW7CLgIawjY6PfXiiZ4aCc3aHUo10maCQl36OhHaFgnmmmHmAaoCCZGpxio2ijYeeiXJ/jXalmZaSiYeldohhlH1wloOTh36Qg5GUk49acZOqc5ynhH1cjIZpoHWB1oeNjJWYdRqRmKltqpGNknt3kaFxcIR4e5RzfoKVx3dbk6Cvh3eEiG6Ee5VtgH94ioR6hHSifI6ei451haGDdpNYjpZxmXZ0YXh8pJJ+friUeGeGjo6KloWFf4V7gXKHf3qVhG57hoeQh5OJYZiCeoR1lX2KeHZ1gXVpeHaOhn2Ac5F4gaRyiVu+hIaCh3qdY594eJuBfXeEfY+Hg2JuhISKiYGdfpWadoqDfIJ7d7pZgX6ekXduloaQg6KCiXCDeJ+SgnaBfHWXX3+Be456aJRuiHaBgoh2hXl9cpCCd4l/cXl9iJOMkYhzgm19cHmabJWLd4Z9d297frRmfn6Oj3ppl3WDdoqBhXl+e59ren58mX9tent8jYiSYnF5eJ+Nfph2lo95bn17dHt4q2V+fpKTemCSdIFul4OFgIp4l3CCgniOgG2FgXqDhZFpa3V3ma58im+Sj3g=","147.7|f5FxpVF4dGrcloKETXdypW1+dLp6X3i+eD+YuFCPh4xqe70pzZdx5Ih5Zq1JhC8+dapCXuiQVXOBaqGUrVtTpYRhLbOWtpiNCrW8YLS6U3CCMI+KfqCXQ7K5erxwpqprjaN6OF1qVnl13ZGNQolXnH6EkLySfl+wyGShjmGSm4Snjm7JYpWDX2gyj6Cf2GSenlVtpGhmg/2beYJ6fYXrwJ+PzH+JaV+8d69NWZ5rZ4idrKmNeY1lZXmEg5qvmaSje5aJZKCOaI5/1HeWeniJhLG1i5qmoqNodoiDopd5opRlhJTFo4RwlGRyjIl+jrWjp3knkaZhfZVkaYGoeoY4dIZ0iaJygq6YeIald5Wrd5GcnG2AX7iehHnjar5D7GGGpZ6jlkyPjrtckoxranOhlH+MfnNpt3LMmN6Lp4+EjYtsiYlvbYSIa49nsJFmW8BuaK2IfIR2l3Otp2+SuHSHP6yOfn2ic2GasnbGrYmdhWKLnG+th3Zsf2NRekWJfJWTpmSNql55bZZph458gI6sdJaHroiCipJzareIdGe2h52QcoqoiVmOcmOAs1OFboh+dY6TcVuKk3eliV11kZZ+gop3jleqioFdo3RUaa11xIGKp6dlk5aAfo2FdIWHpYR/jJR1Z3aUdVvBh5+wZIyEcp+CcnKAWFSKV4yIaoOQc3Vnm3l7YWRnkZh5iKR5f0KPh3+NkHdnkIh6l5KHm5F9h6NpuYN8aYJqXqBZiIlqmJZxb5doeHt1ZHiMlXnClnp/M5SEgIGceFZ7jWihkIWgnGaSlHGcf3hzgWiDnG6WhWeOnn1ykHCYiGJoeY0=","137|a6WnrVCld5q/c4B9Vlipe6KYnF1yq8xS2GOmr07KopJ7ua6ngufALseX1KaUOYjUlZyipcENV5hpoaBqOcJbbJF/YnVwZGHHkVifcoivUo+na2SmfoiMkKlUrcmF2WqiuKl6qLZBWJd3b6FxroVduoOAbltlnX9akYlVpWKXlpSceG7taY6tTVtpgmpiiG1lgW/9mmeAmodkm22Kb31aRquzuoS2K2uasJFZlpV4a69uZIZylXJtfspZWJWKbGW/dG96dXKLbKqiEXajxW1xkrt0tb6GnLmMknmglJ+IlbtndIB3knmemG11qnGUjaFnXZ6DcYdwjJFmepqSgaKCa22MlJZUumCHlXCQksmhhIuPY2yVPZOPcn2abWCnsZpad2dgpntzeHGSiZt0ioR+j359b3eBrlhYaXF6YKpudGp5w4pvaoa4h5FvaW+WhoaOm2GGj2qRoW+qgYeJnXN8ebaLfmmddHqAVmtck3hmqYR1g3iGh3dsiJCVlXCFcp2YX4urXquKbap7nYZqhYSkc41shoV/fZN5doJvcIBqeWiOnXeBXnyLdWSGV5iclWh2loNslZGVa4tjjY5oiXx/hpd4mXZ7hH5jkXV8l2VukIl5aJt9cnZ6gIiVdIFmjYGAfpN5eoV0cmp5eGavgXWGfJaCdnKGdZaVnYNzko5rhqO3cYhijItjh3SBhZF3jV56gn6Dhnh2k3B2dnB5aJF0eHN1k4J4bYZ+k46JY3iBlm2GloV3f1+CjXCJYoRhjHp0WIGBfWOQe3h2eXVubnpqfHtvdHCRg3p0h3l8oHx+doCQYYOWgoqdcIaHb4Y=","135.2|n5KEplGbdcKHVmpoXWebcYxuTpKEkHSrmDCRlVPEm4uQqoaEnLaeNY6td72SPUVJtYrChKPQWrNXZI1QGVZjioqLBJFrj2a3YqW5VamYWqSgZ3GhgGqOnLBeqsCAn2lRrqp7dmLhWKh4U45bg4BiqH6BbJFwoGmkqoNelWaVXL2Ja038b3iOXF2sd4poS3CZhU7zkm53kldqlHJ0kd2ASZeQkJSbXnh6raJdeYvAa6GShYlleHtyoYBMa6g2iWa+aZJWX5aEb6Gbc4OVu3SGhGaEuaedk2mFhWuXho6Fh5tmlHRyiXOdkHCRkINvgHGKXIRdj3pUqYdqgpOQg5u/Z420rp51xoGKi2RweKaZwoyGqG6cXHGLZ3ZicOa7rpGOaYpjm2GLb5Z6galxiqF4gXuOdnidmE9qd4SBXMhtikhn5IRwZoXAkYl4XoysgZN5i22QiGO8gaC6jnqEnHWEbM6BgVaYfJKaYXSOaoBknGuJj2ybgHp3h7GjloJ3hKuxYYmRhJuFdcFcmYR+gIKLdH+TW4OAbZF4kaF1d8tCgWKFgIZJToaHdnOBYZ5xm12DrIpveZOoh3pwn3GFgo+CeaZ3lnhtg39zknmPlWV0o3Z/ZYRri2SJgIGSdoGIhIB7Z496kYx/dZGAhGTUaYiMbIuAdXyCdKBwp2+IoaRvf5LThIFepGuThol7f493jFpvgn11hXqPnnV7oG6BaIpwhlRmsIB7g4R8mGCbVoSFmW2EkIeNgF6PbYOEgH5ljnhvVXd/fluPe5h6fouPaoJqeXCLXWqaf3h6hnd5Zp5vhYeUXomDiYR0apdvg4M=","130|Y5R3i6xvfnpRY2R3aHh7mGp9c6WcbIptclaLvKhqbaCigZtleViGe4J+2nRyfq2mgpJfmEP9pHxyu4Bhd59rbIfpf5VvnYCPm266alu8o39th4uCfIqLXLiEeY6FjoiXi5J7o7OMoIRp0ItnW3prmX2Dc6GFY5BviY1tfZeCnIZocHBjcKGGk6KaiZF8maFywmaGoY9zb4mDhp2Vk3Z0eYyEgY55f4iIhqJylGuOkYCJiH11g4Byn5GNmKKaknd8jneDbpGNjntvuJZ8eImPf4KYiYuKnXh6eJaFmJKTanqVjKGRgHdveHOAkHeNqJSWZJSJeKtrmZaUhnOglIh7i5Bqj2mKinKGcW+knomvpoRqp42Kbrl+dJiict9xV62zZ5Nuipx4rmmMdY2LZ56XdHyAZXmchYZ7lGGHXoeoeqZzfY+JdnurnHSFnH9whXWAeXSYdnLCgpqKiIVykop9nnl1fXdud5F9ZI56eoRmeIx3p3WQhIZ7eq+uinWAh4eNf4OKi7J2Z4mdgomChnWOiHt6uXh/bG14fpZ3iJtyg2d4j3qdelyLiXR9fah6coaFbpp8jXh4gXuJmZOUi3KEfI6HgmqkeXqbYHqQkIWHsGiEa4OOe394hHaKhG+Apnh+eHB5jpJ0iI9SgmiBj3mndYCCiXx7haV6bIR/coh8fXKZoHVth5WKiHiDeouFhHWOeX+Gd3qMhHeGi26CZ3eSeoZ0dYSEiH19nXt4h4F2mnWAdISbfW6Mk4mGfIKEhoR4d5J5fYNte4qPeIeQbIRqbYV8mXhmgIZ9fIGDgXWIgXSVd3xxhXuEdIiRioU=","131.7|lIl7eGx4gWVTX52bmJt5bYG4dJ2TQYWsq62AqHGobYCZZY2MYXhyvYpxpaBYMImseoRJm8wzbnuKtXtZXaWXy4zTdbdsmHlCfqdwlYipb3ltSYB5gZV9XGChhWR1aI+neYKCrJjqcHOH1IRgw4GWYH6BcJt8WZOhWY6ohHGGcWdocZhmjH9/qU+RfopzgKOZbZsZnHV7dIB0bFyAhl+KqGJ8enaJ/ZSLfIeempavdHqBhHRpbnOLmG57dHB7jnRGoo5OlIaJd5dugIyUYoCEfZdsY4Z6b1SNbod9jZ6LmZB1gGVvdHScdYt2cI5dkX6QamaRjFyXiI95aHJYioRqgYZ9goaOloPGQ3FbmFp3ln2Tb3WLcohybHh+jLyWXH1YXZJvYpWLc56TjHl2hZJ2dH16boOTdHFpcHCCZFORh2eOX4l6iHtWk5OIdXhscmFhfX13TGx5dFl1moeMo3iJfXB4fH2Fg4mBcWuUc4JqVI+Igop0g3ttemOjdn6Dgml4l1R5nz1TZ1udhoSWgomWeqCDinZ9jXqFdWiDcXRwhWtuj4Z7iXOLfmh7Z5+BemuAa36PcHljd4B9cHpqhYqBjY16lYykfH6IiIKNgm9vjGOFa2+NjH2EgYuCeY+Wd3t+joOBiXZ8cHZagmlvkYl8inGCenp8aJyHZYh4bXKLbH9ujFtpboF4hZWBhJh5gJKUeYCIg36JkYF1j3mEbXKDg4qQe4F9aXtumJdkZ3hwbZBxfm6Ic2Z4gHKGjoGRjXqWmpd6fmyDg4WCf2+VaoFrbpGMeohufX1yenB8dXaGfnNxjXaHcXdzc26DcYY=","137.3|t5tckVdwYG+/nF1mVXhPT3iMr599d1yxaKxVSFcvjH9xc2VbdmRweGtxtHF1YdWyh5BVopn4WopIr5ifjIFca2hGfnCDl5i4jKw/lohHWoCJl4qBgZyGkTxraK14eX2dnpyApHr9Xn2YcJyYdnJgr397gJ+RjJakSImHmWeqcXmZi0NKbIVseKhbeoubr3CdfpmNXG5Mi2SUjG18bYlie22FgZCEV5F/iG+nkYqrbJNxY4GQXGhte292b3eJjZqIjI+AlIlzb2GKTX17Q5Z0oXNzU5OThWZmj2iTkJ6Gh4xoloufj4hPa25rcIWHdWaRppWqjZ+XWmtraYZudJlypGxZbJNqfm+Gk2WmiIhso4iHr3CRiHKJkIdubysxbpZBeJGgnaONfJSQhJR1iW6fjX5YXHR/WqyLV22Bp2+FiIuQmnJ1a4NQapyLpXGMR2tzbo5hjXKRbKSCd4SHq3aMdHCJgXxidXl5aI2ZboOfpI+Jf4p4eHZlgWNVjoaHcoB0fXB6hGeHY4OMjYqeg4WOcoWEdIR/k2l2hF+Di2Jsgp+Kc4SPn6ludWGDeVp0Xo92blV9dGGSioJOioGYjIF/hox4jZSAgn1yVXN3iZCDX5eEnIGOkWqhfoWLeJx0c4R/lG93fXl7iVlpgp9ykImHiZF8dHKCi1l+WohyiHZ9c1+tYYdiloaciIR+g5Z6hJl/hYGHcHl8cn+HYH6CmoKahW6Jdn15dYJ/YWp1kHOGWXV1YZxkgGWKhYyJm4WMjnmHjX+BgYZke3eJeZJdfISaiIaMio6Nfnpxf4l/XYSVd4VhlnBkk3VqdJCJjIg=","133.3|h6pvcp1UdoWWrIOEpJuCaY6kiG14V5KVg7SXRl95ZG2De5VuhcOuwFhw/XZOlWvBaJZnoZ+5llyit52wPr2hanqWnnN0bmZ+lpSgmYxEYWNeVWtuenmXnq6ZdJ9yjZ6ykqx7nq2LkGx1g6OnqIiejX98eGtpio+RYomDbIxoelqKk3vBkml2oaYuenNklZSLUZtyX21caX5mbWN2gqByqnCLjod0f29rjoiBlouXiYRoc4mbiMmRgopzi3hCdGd+bIZ7k4hucINkZ3uMb46Hm9KQapeMcnSeaH+HlW2Qh4GMeo6TkY2ShJB/fIaOtWdzXnmshGedgWpscWmFfoZnj4KAbMB1tmp1UGh6x4GplI2Lk4l9a3uLlolbjoRniopiVnNhgJOEhKyNiJOETXOHhYGHcYeFhWSPZ395Ym6zhVaMrnF1Z3p8iWtteXyKZZVtem52W2plgJCnaYOEoIF1bZaDgXybiHp3X4x9cXtoko+DZ42JeXhmd3WcjGuEfpR9ln2PeYFicX6Th4aNhIKYhYVoZoOAnJGGe3p3iV9temV7roJLlWJyd2J8b5x3bnV/cI2LfISUfHJ0kIiJiYGBfpqDi2SGgH9ipoZ7jW+GtnR8aJOMhXmVg4SMgFtshX6AjJCEe4N0jVl/fGeBkIFfh4B6enN5bZdycoR8fnyKgHqFemdqhIuCiH2BgpOChVSJgH6Dj4J7hnSGe319aX+JgW6Plnp8e3p2l4d5a3yLmJB4holidWh2i4aFg4BvjoF2Q4OBfnCWg36NeIlye3toeouEYYuYfXtzd3Z3k3p7f4aQjnl7inmIcXqKhoo=","138.3|bI+GibaKnZFJcHl6Wmt/f4SHhKmhdXVabk1/t7NZanOmjFyCTa+jxYp+rVWKIXl+c1+XqzUUsXWwbHdtuHVcSIm0RFmEoHx6elleY4+6qnZrVo19gMF/X0mpd5CYipF7ioR7u1lQqnFqKIl0c3JdcX2BhaaFbphf/Jd+jZ6Kop1feFiKaG6edFRthpN7jblodGF9pZd0blWBiYRpibxesIiLmYCJXYNrdqaUoWNnl4KbPmZ3iyNuhX2Kg3SCkXeDgnBvadGNkmtrWJSKqI6AjUmeq4aKfKB+f2eCYHqNY4KagIS4cHtwc2yDmWx6iGaUYY6WcKNkl5WacG+jln2eooGFcn9+YovOdm6DaXdLpH5pWpJ2fFpwe783bX/Cfm2amZVpg6FyiXecbW6NdY+AdH+Fg3N+iXmXk4eFWo/Vd3BxoouNgHyPm4OXsnCUl8GPg4iUeXJ8h2eOXIhxhI2GaIh1f6Zrdoqmi2q1f4Ngcpd1hXaVhYh1eoGrfHqMf3uAm5h/a495dodagXF9f3KKi5apNHSBimN1iah+bpqJhWZqX3Rxd3aNinR8gqaUiZJ/m06Nj3GPioRmhJFybHCCc3OGfJBVfH2VSnSNd45tj3qEbYSSc3Z5gnF7iISxaXx6kXF5iXl5b7KjhGGfkHN5cHyCiXl5bKOTnYx2lIKPkHnJlntrmYpqb3ODd3yIf4RleX2PbniJmHt3hH6FaH+ZeXBqnoCGcnl0nKeQknNocJGJdax4emiGhnRxboZqfYGLaGt5fIhgeYh4fXuOj4VogIx0XXWNfoR6e2+BoYCjfHBsoYd9qouVepCAdHM=","138.2|sk/gb3dE4qY0e9nWl7u4/LywplRiiMV4rq2mXn5GnJFeWMR7f46qrr5G+o85qpBURnVGTo5WfkGS61aAkXmWf5TFnFqJW33LtniYlUNhgUaip3dZeGhsUqSSSbaMcotoc5F9TGtafEByaFOAWYGVu398iFR5YX+BuW6HZX9o56die7d9kbWpzmaQh2mDuZt+gqCtaIJkl96EW7GEi5uToqp2p6tkR02KV5WEXn5egmqXnHR/nqqNZYytra+eaoeHb4CNlZp4gmmgimt3Tn6KipuumHabjZCUjbZmcIJugHN6Zp2vZ39nkIqJlWOhj6Zkj45nfpaYanF8VZm+cmJOlopXhpucWp6eb5Wddm+JcW1+dn9ifJpsf5OKiVJghI2xgmSLd4iBqIZsfWiAUpSfc356h4dppnRtpoZ0maOmgKOObnh/eIeza3dkgo9pmp+oYZ27b4lGgl+CbnR+nn54vIZ0f55+h3CLkXlso3eRf4N+d4eFd39uhodbY3NoipyCkYpvlcR1e3CWdHd/eX2YfIh/rXZ9eoqCfISEeVmrdZJqkH+BpHN1fmaEolx5ZZKHeKCLglaWkHKLeHx0d459gnN+e4Z5enuUg4VngIuCfpB2kXWAe4GAeXxxf3F/iHp/eIKEc5GIfIiieZCYfYFxiWB+e3SJil2KVWyJa4mKjWGRp3ePc3ZmeIJ9fJN/dpN7eX5rgoB0iYV8bXt7j3uBf3+QYHp+ZIOQZJ1gkoduloSKY5uYeZN0cnt8hnydioGCjXp8gImAg2t7iGNwkXmTgXZ6hIxkfX9ziYuAm21zhm6NjYhxnI+OhnFyeHw="]},{"type":"relu"},{"type":"dense","filters":50,"_biases":"119.2|CBIJGQ4TBgwTFw8KDAcBBwoMAQ0cDAgWAgsJFxEbEAodFw4QFggJBwcSDQkWBwIKDgk=","_filters":["111.8|OzYzOxg9JEg7ODlCPUYyOCs1Jw0tNUI6Jy8fPzc8NyY1ITIxEDc+OjwbJDIdLjM5ID40MDI2PTgwMyg3JS8pOi81ADkzNjI/NyYxNzY5Pyk9OTQ8NUQ7Kj06MCAtMzcdFzg6OSxIMzUdQCkpNTA9OzQ7ITo4Mjkv","19.2|S1IxY1RIV1FAMVFcVlEtXD4BM0FgXU5CTFtTTlFJTEMtUElAX0dbS0ljVkFlS1VBP0FaRU9aYTFIXExKX1czP2BBQk9CQlRIMUNkSTpBXWlZO01RYVJiZEI6RVpRSzZgNDYyRlQzOz5TS05PPDtdTUVIZVpOVl4w","112.2|Oj0fQi04KB45MkUAPzw5HzkzLi5BOzQsJDw3QUAlOjAxMTUnSS9HQgpHSjEwMCYzHiwpLSsSQSw2TjgwMB82PSktQSkmKjgnMB8qLyozCkkoNy0fTho8TzMtGkIxNy4/NTIsDDAyNSZBNTU8GDMyOzkoLUE4ORYt","19.6|TyEmUTdPUVdQIFJEJDNDSj5KVFNRKj0tNlRRME9JT1Q2QTlKT0BMH1VZPklTQRo4QVBDOE1BWlFGS1E3SVEAUSVXTkxCQTtNJUVgIU9JU19ATydAVRNSKjlFR0dERkNVSUctP1YvJEVeVUdSUThCWEVSX05PTTk/","111|OmMwUjJJQ29EGkxkR0Q7W1I6SU5HR0sxRkxYQ0BNQl4qTy1KSUBFVD9kZCteNk0uTjpKT0JGU0wsW081XD5BPT9VRDwAMUhAPi9oOmQPZlNlQFFGYVZcTycgWlpOMypJQCskSVNJHjZqTEI6TTZPUC4xbko9TmAt","17|W19cTVxaXDpXRFddXk1CUVpYW1dQXl5NYVtRXVpbVyhOS1JOV1tbTlViXVVeS2FVW09ZTltXVVNXUl09QVxYW1thSklWSFtRTlpSTk9aWURhVFNbXmhBUFdVWFxOWE5cV1kBW19kRVplZENbYlU4UFRYRl5WT1dR","112.8|KhM5JDglOCw7MCEtL0EvOSwrIycyETgsMwYAGhYVGzcvOCI1KTYmKTU4NjAnOTczOBURITQuDDYgSCQtHC4yMzMaPjgwMSwnKzZENTkrACkhJS4jMioWPSQvFzQ8LjIYOjAtNCU8MTEXMDU9NC1AISgoLzchHigy","113.5|KAgmODUsCTExLUMxKUAkLxktSCM8PDgpFTg3ODowNTctQxInMxQ/PCw/FTVELzAgHCQ3LRsyOBkkUjwtUzw2ODY4FTMmMSsoLSBHJQ8ePkYSHS0nQUA1HSArRAA5DycxORssMTpJLzFCJzEnHCMPPDIyRDQyNSYw","112.9|Nz8jVks1QGkMC15AAi0uTykiXR41PiIWQk1MTj1DM0sKTjMsOipAFFNgThhKLEonNDZJRz1CWD0xPj4wXBkpIFg2UTEhLUYBNCVlIhwWQ19NKTg5VFBeTycUOEVYHyA7WxcpGU9iIStpUTgcVTNcVjQ0Pjs8QjUL","19.5|S1EvN0lOYD9CO1ouPk89TTszWk0bSzxDVE9JSE1DRyQ/UkhLVTRGVxtMU0pJSk06OUBRVj8/RkRMSEg/Y0hDTFBLVUcBPEc1Rj9VOTc8SFMeSTIfUUFQT0k5TDdDSEhGUUszRVAwQEpCOUJJR0lXSzpDPEVLTUZB","114.5|Kz4sNRIhRywrKkErJzwuMSgoJwYzBiQuQhEQMycaIS8sHg4qETUZSzQ9PxYhJDIsERQpMjQEPTUVRxAsRDMwGTgzLC4nKhwxGxM7IikSM0Y0JwkyNkAWJCcqJzg9MiAAJiYqPA4rLQsiKhEeOhY0Ki4bAjMkIDoe","112.4|NUMuQiA5K0onMyo8Fi42MT0xSC4rQTs5RCwOIRw5Nyw1MysoLDsoNzVCODUNMyI2FScqPSk0DjguLTQ4Kjo3Li87FC81NzI5IScnK0EpGT43Ky08QzonLjc2SiE9IjIaMDk4NxFFOBgHOBI8OB5CRTo1ADQcNykr","112.5|LWJVVFUyOGhIDmI4REwzV0sDN0VlQDwyRFJTRUMxPFwjPjhFUjlQbmBTTyFYI0YiKShNOhtTWUocPkY5aDU+KDhET0cAJEwvLgpLFmIDYWJkOEw8WlNgSRcBVFNZPhY7XyAgVFVEAQ9VXz09TD5KRhoiUVE0T0Mo","112.4|ISU1HTc5QisuL0w9IEQ3NzguOyUpQTUzOTwBQDk6MTwwOjE4FSc7TC0sLhwVNSwyMzQrOiI+OTwkUCkwTS01Lz86Eio0Nik4LzdDLzwvREIdKzI+Q0MkPCUzOxQvNjIeEDEyLxczNDUdMRYyNyUdMTI4PTQoLjkp","112.5|LQQ2OTY1AiU9Ly4yMygsLikvLC8sNyssQS4zKysrKjUwKTQvBS9BIC4lGDAiMTYwMi8wLTQkMTIuESgtLC8uJzIVODMvLCkyNi85LyIxNgA0LzQuEUUUBjEtJSk3MjE2MDAtMzMdKjMaKC4sHjNDNDMvOzAvLzIz","111.5|JEEyJTQ4Mzo4OSsbOTs0O0E7STtFF0A6MhlBKC84LyU6LTczLDktS0ERKTJGMQ07PD02QTslLDY7OhY3NjQ8OT1BJTc5Ozg2OzIlNDE4AENCNzEzQjpNQDc8RzwwLjVGQzs5NTIvOSkqRjYuSDgtQzUzGjQzMDk3","113.3|IQw2Pjw9BDwxLx8QKTguAjA0SDMuPTgsNyk5Ey4ZITsxGTIeFCA5GjAHNR8bNC4yLiYzOjcJFiMnGRQrQzgyNDohOyQzMCguLxUxLkEuLQotLTMuBzEzHDIoNxY0DTA7GzMkECY3JTEBIy81HSg/KyUgPxkxMSEq","112.7|LRQ6MSglQEA7NDk/KUQ2OTIsUCUpODsxPB0TKxMPNDU0QSQ2KzZIGz8yBiM3Nzs1IhM2OjI4BTgcNzQxID80Mx8mPzoyNTk1Ki1BNTwlQDkpLjU5OkUuPx8zNxRDLjI9PSU2PgFINjQKPCUwNiUnQyw3PjkQJzkx","113.2|FTQdIS0TEEYyKzwJKjUxATEmHDQIFjspEBoyHyIyFC0sNDATOitBHgoSPy0sJwgtNi0OEyk1IC0yTREjVD0hLxAsMxwtLBgvLTEXKzwxHigvMyQfODBBPC8qPjYqNS03ODEtCDgdLC9BJy0vBDJFPicRGAkqFDEu","112.1|KmNbVCMyWmpLFF8+akdIVjoQXkprYUA6SkVHWkQzMjcZPys5Tio2b2BkSRdZL1sNMiZGUSRWZEYwTkU+UzBGKT5QUUwRLEJQUChQHlAKQFJINithXHBhXx4BUzVANhk4QCsrO1BEGipaZUFGT0FtZyAtbFZDRl0h","110.6|T187UBJJaGJLMSBNVlE6QlIBX08zPiw9VlJGVUNMOxslVkZGTCU4Z1dGTTtbSUtBUD9LKBNTWik3Tk4pViJGNjkVRTg9K1I0ST5fJyU2TFEtOD8rVltkVUIJPEI1PEI3JzwzVUpaMTpWQ0oPLj1kNQs8NUhOMhU0","113.4|FioyJR8RJAsyMkEmMjgwLDEtQjUwKjguGi06JiwsNjIuNColNgE8QjExLCYyIisoIysxOS0NMhMtGiIvMT0mMkAsLzQwMTYuNyA1MR8sRDczLTIYGkI9NzMsNygmMipAOyI1NCsiKzU/KDQnKzMUOTY3Hw8xLTAu","114|JyIeIi80Ik0QIhoTNTIkORInVh48HjooGx4kNzEoJykpNw0vECE3TzYJGC9KLyYfLS4zLzExOyoZTTUjSzQnNDA0DSUoKSEaLSlJFxcZDB4vGxU2HiEOGx0mQBckASkfKCkYNzlUJg5IKSUiOBsyDykZRDcxMjwk","111.8|LUUlUUc3YVBQFV1fOztJSDktO0xkXU4wQ0tXTENKOVQbUD46SUNSWTlPaCJfN0YKLidMUT1EVjkwSUIzVT5YN11KQEggLFFPPA5nMUwBOWMwPhs/XVBYTyYaSTlbPyk9PTU/VEhiGCZQWjxGSj1PXyk6TFlKTUkt","112.1|LEMyOjoSMjY4MkNDPEY4OS02UzowIT0xRhY+KCQ7Fi02JTQQHjkcSTkBSDQNNRY1NDkkKTM0MSo3SCI0NDE2MTs/MzQtMxY7NzRCMCc5MEgxMzUpMR4hHzU0RkE8KjEgLDEyJStFNDINDzU2LTg6RDIaTygzEhgx","113.5|MD81OzchRjE0KCoAOD4wKDUrODI+PjkoRD8vLis5HS0hUw8xMS8fPi1FRy1YLDorNxguKSoLSSYnUzgrLCwpPisvKDAmKyUvLxRIKT4UOEovMw81MVAkJC0iPS9LLiEEQCAXITJbKRFJIS04PSwcJykKKDwzNiUo","111.4|F0I9AEIfRh85Oy9BMkk+LD4/Uz0yODM2RjIuCzI6OEM6Nj01RCtGJilDUSsxOSo0QDIrQj1CMUIuLBU9UTE7OUMwQzQ+Nz4yOkEKPkY2IEAwKz4hPDdMQi87MSlELjtAMDs+NSVMODk+Qz1BOzo/QT1ALy8wOkE4","19.8|Rz0AV1FFLmhJPFNNJVU4TDs7Z0pNVTxBP0VOQExMSUQ3TUk+Sy5ASg8/O0lSSEMsRklFUUlQSUZKRExAZUMOTFtOVjYGN0sTSjJBMVVEFU5CSUciSF5aSkIvO0NdQUdcT0cyS09cOTtPOkVIVkVMU0JEaEtCP1Q8","112.3|KGEqZDAwO2c7Cl1YRUEzSUwVST1CQksraFFXV0Q5NTgjSycxRzxHTzpXYSJXL0ELSyZUSUE4ZkYnV0kwUk82Nj5LUzUAMUotNw1lLFoqQGE6MChjWlBiWxQaSVhGPyJCXS8tU0NwDhxlXy5ESDJHSyYqaEc3QFck","110.2|SSYaTUZPSllKJVcuRz1DVTdEWlJIHTo7LkpIHlRPSUslTTE+VDdTLElAM0JKRQtBKUhES0gqWEZGSU5AXEgBTT1XTUg6RDpLOzo+L1pCSFgfSTE6VylUUjpASE1QN0RWQkgwM0w5HUI7QEVIR0RbQzxOX0RCQUA1","110.3|QjNITA5APjZONDpKSlInQD8INDwmMktAV0VCSUZLRzoySUFIUD9RW05SQEFNPkc+S0FFNUVIS0NGT0c+XkZRRh8vPUIBOkBCQUk9QUArTFA/QyNLRl5WRTgsUjlNSEE4KEISUkU0QkhVUEI5UUVUSkFGN0NHPj9B","113|MxY1OzgXPEg+LEI6Nz4uJjEvPCUTNC0tEiw3HiwmIBctQiceNRk0MDY5BCUxLDkuLTcxKDYQNRoyKzksRjMzNyQ3RjUvKyo2NyEVNSovNBo4NzYIEytQPTEwQTc7KzMmJR4yKhtKKTIMKDMkDTMBHy8uMRUxJSgy","110.2|U15GTjJPVmhGOD1BVEZDTlEZY0dOTydFTE9QVkhGQQAgVks/VTkwXVc4XEFSTkdGTUlRLBpQViA+RE4reA1SOVomUzM/KVcoSjNcIkQwOT8UPkdDTWdgTUAOKzEnRkJSRDovXVRoL0JhV08YQkdlIBNDX1BKOjQ0","18|Vk5YWVdQVTtXQFRTUEpFPVhUWVdVV11GXVdRUVFZUjA+RkRBWFNYYEZdWlRYR0VRTENUWFZHXkFWR1kzQlZWVFpPQUFPRVhXWFVhVV9VWElVTVRZRWhBTVBRVlhCVUhZWlIBW0ZgO1ZcUT1SW0k8ZFRSTlFJUmZV","112.3|Jzk5NBA8Lkc9NkksGTYyQTI3KhhDIT49JxIvOSotOS85Gi40ADlBUEIVNCguMSg1FTg5Py0oIjkwQhY3QkEpJUo/ETk0Oi46KRdENkEzPS48NidBPy1LQTs2ShsmKTNDPD06PCEzNC0VNxo0Qik8Jjk7BzInLUAn","113.7|L0EsPiElQzspMyIxOUQ0OCQxSRUpFTowQyErNS0fIjovFxErJDQkNEA/OxoWMTcvFRg5OjkBLjEYOBIuRzI0KDI5LzgwKhw0LBVDLDcVNEg8MBM9HUwlNi8xRDo7OCYQIycqORxEMhUYMxwmRB43PCgcHTIvJUQl","110.4|QiE3XD5GZ1oYL1VRE0IjQwsBOB5KTzAtWFZYT0hSSk4uUkI/TkRXHFlOJjNhSUc9SUhQP0hPTDFKUUg9ai8+O0gjQ0Q0MkwaHUVKPg80UmpMPjNIYVhiW0YrJVhgNjVYIiUuL01EP0ZKVUcuMzZiVDpIUkZFTDwm","112.6|Jz4TFxUvMFQgKkIwNy8mLjMpKDFANDUzFzo6MzQ4OyIuQDIdOQFIQxweSzQ0LRMmJDg8PRZCIyA0Nzg0NDklPTwwHTIuNjclNTEqKkAzOi84IzQ7RTBLRjIyNB0kGjI9IjM0RTFIMDRAPDAvHS5HLTU4LiU1ODEs","111.9|GCQ6ADcsPk8/NUk+OycyQjkwQjc6Jzo6QS0IHC8zLCwzQyZAPC83UzZAHzhNPzQvPyodOTo1KjMlLjA5DyI0ND42Mjg4NjwjPT8UNjU4PQkuHzMFRkIdQy81SjscPjg2QCU6RRxKNThEOTg2QjAjNzo9SCsbNTQ7","111.8|PEIvAC8aRR4sMipAPzA5KTs2Kz1CJkM2KDEvEx8tOT4yNjw7KjgyLDxBGTkuMD02JSBBLi48CzQrMzg5TEI8MShBOzY2ODknNzsUODg2GUQiMjAnQUlGMyE1MzM/MjsvOTM4RykeNy5BOC04PjMcRisuODsoOUI4","111|LEYuADUlTSkqOUE2M0g7HD83M0MiPjc+PkM5PjxDMyk7RD0pSCcsSBkkNTdCOwQ9PD86RTk4QzY+Ojs5KR88QC04JTc8PT9ANToEOzo7MSU+Pzw6NTotLj07Pz86Pzw8PzU9FTwuNzlANjY6RT4tNT85Oxw0LUQ9","17.6|U1FUW1hYWF1SOU1ZW0JQW1JUWFdbR0hGSFBTWFRUWB5AS1VWUVhWb1tMVlNTTlhNVVdWUFBWWlhTUk81SVRBV1lUT1VTSk5TSFc2PGVUWEAsWFVYSkRLPk9LVFdYSlJUTlYAUFFZOVVYYFRXWVYuSVNXS1RMU1FG","112.9|JSApHi0uFiYxMzUqOUAfOhwwJSktODAzADUqOzwzNzUsPh0wTAs7QzdJMDQ4MzAjHTA3Oik2PRkkRTMxKDM2PD84GDcuMSkhNis3MA0qPCkjIy8jMTxJJCwyOxAgJC4zKSAwQj5PMjpJMTYjIjA4Pjg7PCw4Ozg2","112.7|EiI7Dy8qP1A+MUcyJzwnPC8qKzA+Ii8xORYAECgbIiwuQyc1PjIiTTgwRS1DOiswNyANLzs6MDoeUhcuTDg4PkFAOTc1NDYiKzolNj0vBgM8GTIgPRxTMiM0Eh81KDImPC4uKyc0NS4qQDU3KypJIDM0PSkfIzo2","111.6|OTE8MS8xQRpIK0k/LDYyHkU9S0Y3LzwyLj9HMz1GRRsnNyosSDBLPDVDRT5INyw5OC5AOTwbLCZFLjcpOE44Q0kuLy87NUE2OTwjNRo+TSEqPDk4HDhBOj47RkIpPTZPUDofTCg0Lkc+Lyw8OyoBQEJCHho3Mz86","113.9|KTIsPDEwCioeLA8RFzUwHhcsFSQoDh4uJwcaNjAUGjYnAxoxNzQPJzA1RCcaLjIpMBgyJi8SIikbIQomNjUoHTAvPxwmJRAxHSg6JDUcEzomJhctGyYCPSooHjY9LCYcBSUeOC4XKS0iEiAjGx83LCQUASYiHiAk","113.8|DjgvGzULEEAcIyQaNTUqGBkpLS0HJyspGh4gNyo1BS0oHCANJCM5UwIcQhwTJQ8rMS8NOTE4OzAeKhgrUhEhIyo5NxYqKgoyMC8tKj8rKCgfJSw3DRIzJCsnLjVHGSoHAS4kRytVKS0jCysyCSoTGSsqRxMvCywh","111.7|OUMgRzQ6RzQkN1oaQTs8Jj06UzdAQjgyQUA1QEMuOz4yOT4iTDcgWCciTi1KLx03JDkqJzYUQT09VDQ5TykuPS43KTMsMTsyPB0xLz06AVI8OzcuRCBVLjYyL0IzNjVCQi82DEA+Nx0/KjE4MzdKJzwkSz88PSow","18.8|T1VFWUJKU05OLT9ULkA5VVBOSUpXUkc1WVNLSk9IUB5CSE9LUkVLOFNNS0ZKQ0BHVFNOUFBXPldOR0ktUk82TD9YTU1KQFJSP1AzLjZES2A3UE5OWD1NLUlMUEpOTkVQSVAAS1c9N1BLR0BRRjdqREVQa0BSUUZD","112.6|MDMtPDspUUIjJDFEQjkuPywpRT42RDkjPEQuOjE8NTYlPSApWCxOSiNPVS9DMTorNCY1MxhCSDwZS0AvVDY9LCJHOxgkLSg2Hi9NGjknT04ANRxBQkJDTyEeUj5KHiQuFTIcSUVSKjFTQCk+LiskTDIxVDs7OxUj"]},{"type":"softmax"}]};

    // node_modules/toygrad/dist/buffer.js
    var Buffer = class extends Float32Array {
    };
    var buffer_default = Buffer;

    // node_modules/toygrad/dist/utils.js
    var isBuffer = (value) => {
      return value instanceof Float32Array;
    };
    var isNumber = (value) => {
      return typeof value === "number";
    };
    var isUndefined = (value) => {
      return typeof value === "undefined";
    };
    var randn = (mean, stdev) => {
      const u = 1 - Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      const rand = z * stdev + mean;
      return rand;
    };

    // node_modules/toygrad/dist/tensor.js
    var Tensor = class {
      constructor(sx, sy, sz, value, dvalue) {
        this.sx = sx;
        this.sy = sy;
        this.sz = sz;
        this.length = sx * sy * sz;
        if (isUndefined(value)) {
          const scale = Math.sqrt(1 / this.length);
          const get = () => randn(0, scale);
          this.w = new buffer_default(this.length).map(get);
        } else if (isNumber(value)) {
          this.w = new buffer_default(this.length);
          if (value !== 0) {
            this.w.fill(value);
          }
        } else if (isBuffer(value)) {
          this.w = value;
        } else {
          this.w = new buffer_default(value);
        }
        this.dw = dvalue || new buffer_default(this.length);
      }
      index(x, y, z) {
        return (this.sx * y + x) * this.sz + z;
      }
      get(x, y, z) {
        return this.w[this.index(x, y, z)];
      }
      set(x, y, z, value) {
        return this.w[this.index(x, y, z)] = value;
      }
      add(x, y, z, value) {
        return this.w[this.index(x, y, z)] += value;
      }
      getGrad(x, y, z) {
        return this.dw[this.index(x, y, z)];
      }
      setGrad(x, y, z, value) {
        return this.dw[this.index(x, y, z)] = value;
      }
      addGrad(x, y, z, value) {
        return this.dw[this.index(x, y, z)] += value;
      }
      clone() {
        const clone = new Tensor(this.sx, this.sy, this.sz, this.w);
        clone.w = clone.w.slice();
        return clone;
      }
      cloneWithZeros() {
        return new Tensor(this.sx, this.sy, this.sz, 0);
      }
    };
    var tensor_default = Tensor;
    var getNgrams = (str, length) => {
      let ngrams = {};
      let total = 0;
      for (let i = 0, l = str.length - length; i <= l; i++) {
        const value = str.slice(i, i + length);
        ngrams[value] || (ngrams[value] = { value, count: 0, frequency: 0 });
        ngrams[value].count += 1;
        total += 1;
      }
      for (let value in ngrams) {
        ngrams[value].frequency = ngrams[value].count / total;
      }
      return ngrams;
    };
    var getNormalized = (str) => {
      const hyphenRe = /-+/g;
      const ignoreRe = /[^\p{L}\p{M}\s]/gu;
      const whitespaceRe = /\s{2,}/g;
      return ` ${str.replace(hyphenRe, " ").replace(ignoreRe, "").replace(whitespaceRe, " ").toLowerCase().trim()} `;
    };
    var infer = (text, langs, ngrams, nn) => {
      const textNorm = getNormalized(text);
      const unigrams = getNgrams(textNorm, 1);
      const bigrams = getNgrams(textNorm, 2);
      const trigrams = getNgrams(textNorm, 3);
      const quadgrams = getNgrams(textNorm, 4);
      const inputUnigrams = ngrams.unigrams.map((value) => {
        var _a;
        return ((_a = unigrams[value]) == null ? void 0 : _a.frequency) || 0;
      });
      const inputBigrams = ngrams.bigrams.map((value) => {
        var _a;
        return ((_a = bigrams[value]) == null ? void 0 : _a.frequency) || 0;
      });
      const inputTrigrams = ngrams.trigrams.map((value) => {
        var _a;
        return ((_a = trigrams[value]) == null ? void 0 : _a.frequency) || 0;
      });
      const inputQuadgrams = ngrams.quadgrams.map((value) => {
        var _a;
        return ((_a = quadgrams[value]) == null ? void 0 : _a.frequency) || 0;
      });
      const inputNgrams = [...inputUnigrams, ...inputBigrams, ...inputTrigrams, ...inputQuadgrams];
      const input = new tensor_default(1, 1, inputNgrams.length, new Float32Array(inputNgrams));
      const output = nn.forward(input, false).w;
      const result = Array.from(output).map((probability, index) => [langs[index], probability]);
      const resultSorted = result.sort((a, b) => b[1] - a[1]);
      return resultSorted;
    };

    /* HELPERS */

    const nn = new NeuralNetwork ( options );

    /* MAIN */

    const lande = text => infer ( text, langs, ngrams, nn );

    // Listen for messages from the main thread
    self.onmessage = function (event) {
        const result = lande(event.data.text ?? "");
        postMessage({ id: event.data.id, result });
    };

})();
