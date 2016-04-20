import Painter from "src/ui/Painter.js"
import Rect from "src/math/Rect.js"
import Matrix from "src/math/Matrix.js"
import { seq, Seq } from "src/base/Seq.js"
import MathPainter from "src/ui/MathPainter.js"
import Util from "src/base/Util.js"

let redraw;
let advanceStateFunc;

let absCol = m => Math.sqrt(m.adjoint().times(m).trace().abs());
let normalizeCol = m => m.times(1 / absCol(m));
let normalizeDensity = m => m.times(1 / m.trace().abs());

let generateUnknownState = numQubits => {
    let buf = new Float64Array(2 << numQubits);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.random() - 0.5;
    }
    return normalizeCol(new Matrix(1, 1 << numQubits, buf));
};

let controlify = (matrix, controlMask) => {
    let w = matrix.width();
    let h = matrix.height();
    let newBuf = matrix.rawBuffer().slice();
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            if ((controlMask & r) !== controlMask || (controlMask & c) !== controlMask) {
                let k = (r*w + c) * 2;
                newBuf[k] = r === c ? 1 : 0;
                newBuf[k+1] = 0;
            }
        }
    }
    return new Matrix(w, h, newBuf);
};

let expandOp = (singleQubitOperationMatrix, qubitIndex, numQubits, controls=[]) => {
    let controlMask = seq(controls).aggregate(0, (a, e) => a | (1 << e));
    let opMatrix = new Matrix(1, 1, new Float64Array([1, 0]));
    for (let i = 0; i < numQubits; i++) {
        let m = i === qubitIndex ? singleQubitOperationMatrix : Matrix.identity(2);
        opMatrix = m.tensorProduct(opMatrix);
    }
    return controlify(opMatrix, controlMask);
};

let postselectCol = (col, qubitIndex, qubitValue) => {
    let mask = 1 << qubitIndex;
    let newBuf = col.rawBuffer().slice();
    let h = col.height();
    for (let i = 0; i < h; i++) {
        if (((i & mask) !== 0) !== qubitValue) {
            newBuf[i*2] = 0;
            newBuf[i*2+1] = 0;
        }
    }
    return normalizeCol(new Matrix(1, h, newBuf));
};

let postselectDensity = (densityMatrix, qubitIndex, qubitValue) => {
    let mask = 1 << qubitIndex;
    let newBuf = densityMatrix.rawBuffer().slice();
    let w = densityMatrix.width();
    let h = densityMatrix.height();
    for (let c = 0; c < w; c++) {
        for (let r = 0; r < h; r++) {
            if (((c & mask) !== 0) !== qubitValue || ((r & mask) !== 0) !== qubitValue) {
                let k = (r * w + c) * 2;
                newBuf[k] = 0;
                newBuf[k + 1] = 0;
            }
        }
    }
    return normalizeDensity(new Matrix(w, h, newBuf));
};

/**
 * Eve sure is nice to let us use her computer! Let's put all our secrets on it.
 */
class EveQuantumComputer {
    constructor(initialState) {
        if (!(initialState instanceof Matrix) ||
                !Util.isPowerOf2(initialState.height()) ||
                initialState.width() !== 1) {
            throw new Error("Initial state must be a column matrix with power-of-2 height.");
        }
        /**
         * @type {!Matrix}
         * @private
         */
        this._actualHiddenState = normalizeCol(initialState);
        /**
         * Pay no mind to this, Alice.
         * @type {!Matrix}
         * @private
         */
        this._inferredStateDensity = normalizeDensity(Matrix.identity(initialState.height()));

        /**
         * @type {!number}
         * @private
         */
        this._operationCount = 0;

        this._expectedIgnoranceErrors = 0;
    }

    /**
     * Initializes the computer with the given state vector, without revealing it to Eve.
     * @param {!Matrix} column
     */
    static withInitialState(column) {
        return new EveQuantumComputer(column);
    }

    /**
     * Initializes the computer with a random state, unknown to Eve.
     * @param {!int} numQubits
     */
    static withRandomInitialState(numQubits) {
        return new EveQuantumComputer(generateUnknownState(numQubits));
    }

    /**
     * Hits the hidden state (and the inferred state) with the given matrix.
     * The matrix should be unitary and of the correct size.
     * @param {!Matrix} opMatrix
     */
    applyOperation(opMatrix) {
        this._operationCount++;
        if (opMatrix.width() !== this._actualHiddenState.height() ||
                opMatrix.height() !== this._actualHiddenState.height() ||
                !opMatrix.isUnitary(0.001)) {
            throw new Error("Operation must be unitary and match the size of the state.");
        }
        this._actualHiddenState = opMatrix.times(this._actualHiddenState);
        this._inferredStateDensity = opMatrix.times(this._inferredStateDensity).times(opMatrix.adjoint());
    }

    measureQubit(qubitIndex) {
        this._operationCount++;
        let actualOnNess = 0;
        let predictedOnNess = 0;
        let actualBuf = this._actualHiddenState.rawBuffer();
        let inferredBuf = this._inferredStateDensity.rawBuffer();
        for (let i = 0; i < actualBuf.length; i += 2) {
            if (((i >> 1) & (1 << qubitIndex)) !== 0) {
                let cr = actualBuf[i];
                let ci = actualBuf[i+1];
                actualOnNess += cr*cr + ci*ci;
                predictedOnNess += inferredBuf[i*(actualBuf.length/2 + 1)];
            }
        }
        let result = Math.random() < actualOnNess;
        this._expectedIgnoranceErrors += Math.abs(predictedOnNess - actualOnNess);
        this._actualHiddenState = postselectCol(this._actualHiddenState, qubitIndex, result);
        this._inferredStateDensity = postselectDensity(this._inferredStateDensity, qubitIndex, result);
        return result;
    }

    /**
     * @param {!Matrix} singleQubitOperationMatrix
     * @param {!int} targetQubit
     * @param {!Array.<!int>=} qubitsUsedAsControls
     * @returns {!Matrix}
     */
    expandOperation(singleQubitOperationMatrix, targetQubit, qubitsUsedAsControls=[]) {
        let n = Math.log2(this._actualHiddenState.height());
        return expandOp(singleQubitOperationMatrix, targetQubit, n, qubitsUsedAsControls)
    }

    drawState() {
        redraw(this);
    }

    drawLoop(func, period=100) {
        this.drawState();
        setInterval(() => {
            func();
            this.drawState();
        }, period);
    }
}

let traceQubitOutOfDensityMatrix = (density, qubitIndex) => {
    let newBuf = new Float64Array(8);
    let mask = 1 << qubitIndex;
    let w = density.width();
    let h = density.height();
    let buf = density.rawBuffer();
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            if ((r & ~mask) !== (c & ~mask)) {
                continue;
            }
            let c0 = (c >> qubitIndex) & 1;
            let r0 = (r >> qubitIndex) & 1;
            let k = (r*w+c)*2;
            let k0 = (r0*2+c0)*2;
            newBuf[k0] += buf[k];
            newBuf[k0+1] += buf[k+1];
        }
    }
    return new Matrix(2, 2, newBuf);
};

let estimateTraceDistance = (m1, m2) => {
    let d = m1.minus(m2);
    return seq(d.eigenvalueMagnitudes(0.001, 100)).map(Math.abs).sum()/2;
};

let qubitTraceDistance = (d1, d2) => {
    let [x1, y1, z1] = d1.qubitDensityMatrixToBlochVector();
    let [x2, y2, z2] = d2.qubitDensityMatrixToBlochVector();
    let [dx, dy, dz] = [x2-x1, y2-y1, z2-z1];
    return (Math.sqrt(dx*dx + dy*dy + dz*dz) / 2).toFixed(4);
};

redraw = computer => {
    let numQubits = Math.log2(computer._actualHiddenState.height());
    let canvas = /** @type {!HTMLCanvasElement} */ document.getElementById('drawCanvas');
    canvas.height = 1000;
    canvas.width = 1000;
    let painter = new Painter(canvas);

    painter.fillRect(new Rect(0, 0, 150, 150), 'white');
    painter.print('actual', 50, 5, 'center', 'top', 'black', '12px Helvetica', 75, 50);
    painter.print('inferred', 125, 5, 'center', 'top', 'black', '12px Helvetica', 75, 50);
    painter.print('distance', 200, 5, 'center', 'top', 'black', '12px Helvetica', 75, 50);
    painter.print('actual (full state)', 275+250/2, 5, 'center', 'top', 'black', '12px Helvetica', 200, 50);
    painter.print('inferred (full state)', 550+250/2, 5, 'center', 'top', 'black', '12px Helvetica', 200, 50);

    let actualDensity = computer._actualHiddenState.times(computer._actualHiddenState.adjoint());
    for (let k = 0; k < numQubits; k++) {
        let actualMarginalBit = traceQubitOutOfDensityMatrix(actualDensity, k);
        let predictedMarginalBit = traceQubitOutOfDensityMatrix(computer._inferredStateDensity, k);
        MathPainter.paintBlochSphere(painter, actualMarginalBit, new Rect(25, k*60 + 25, 50, 50));
        MathPainter.paintBlochSphere(painter, predictedMarginalBit, new Rect(100, k*60 + 25, 50, 50));
        let traceDistanceQubit = qubitTraceDistance(actualMarginalBit, predictedMarginalBit);
        painter.print(traceDistanceQubit, 180, k*60+50, 'left', 'alphabetic', 'black', '12px Helvetica', 50, 50);
    }
    MathPainter.paintDensityMatrix(painter, actualDensity, new Rect(275, 25, 250, 250));
    MathPainter.paintDensityMatrix(painter, computer._inferredStateDensity, new Rect(550, 25, 250, 250));
    let probables = seq(computer._inferredStateDensity.eigenvalueMagnitudes(0.001, 100)).toArray();
    let dw = 250/probables.length;
    let dh = Math.ceil(250/16);
    painter.strokeRect(new Rect(550-0.5, 280-0.5, 250+1, dh), 'black');
    for (let k = 0; k < probables.length; k++) {
        let h = dh*probables[k];
        painter.fillRect(new Rect(550+dw*k, 280+dh-h-0.5, dw, h), 'green');
    }
    let entropy = seq(probables).map(e => e <= 0 ? 0 : -e*Math.log2(e)).sum().toFixed(2);
    let traceDistance = estimateTraceDistance(computer._inferredStateDensity, actualDensity);
    let entropyText = "Remaining Entropy: " + entropy + " bits";
    let distanceText = "Trace Distance: " + (traceDistance*100).toFixed(1) + "%";
    let stepText = "Operations Applied: " + computer._operationCount;
    let scoreText = "Accumulated Misprediction: " + computer._expectedIgnoranceErrors.toFixed(2);
    painter.print(entropyText, 550+250/2, 282, 'center', 'top', 'black', '12px Helvetica', 400, 50);
    painter.print(distanceText, 550+250/2, 300, 'center', 'top', 'black', '12px Helvetica', 400, 50);
    painter.print(stepText, 275+250/2, 282, 'center', 'top', 'black', '12px Helvetica', 400, 50);
    painter.print(scoreText, 275+250/2, 300, 'center', 'top', 'black', '12px Helvetica', 400, 50);
};

export default EveQuantumComputer;
