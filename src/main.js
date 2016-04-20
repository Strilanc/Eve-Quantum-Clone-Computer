import Matrix from "src/math/Matrix.js"
import EveQuantumComputer from "src/EveQuantumComputer.js"

let numQubits = 4;
let qpu = EveQuantumComputer.withRandomInitialState(numQubits);

// Pre-compute matrices for operations.
let X0 = qpu.expandOperation(Matrix.PAULI_X, 0); // X gate on qubit 0.
let X1 = qpu.expandOperation(Matrix.PAULI_X, 1);
let X2 = qpu.expandOperation(Matrix.PAULI_X, 2);
let X3 = qpu.expandOperation(Matrix.PAULI_X, 3);
let H0 = qpu.expandOperation(Matrix.HADAMARD, 0);
let H1 = qpu.expandOperation(Matrix.HADAMARD, 1);
let H2 = qpu.expandOperation(Matrix.HADAMARD, 2);
let H3 = qpu.expandOperation(Matrix.HADAMARD, 3);
let CNOT_2_ONTO_3 = qpu.expandOperation(Matrix.PAULI_X, 3, [2]);
let SMALL_Y_ROT_1 = qpu.expandOperation(
    Matrix.fromAngleAxisPhaseRotation(Math.PI/3, [0, 1, 0]),
    1);
let SMALL_X_ROT_2_WHEN_1 = qpu.expandOperation(
    Matrix.fromAngleAxisPhaseRotation(Math.PI/4, [1, 0, 0]),
    2,
    [1]);
let CONFOUNDING_X3 = qpu.expandOperation(
    Matrix.fromAngleAxisPhaseRotation(Math.PI/2 + 0.4, [1, 0, 0]),
    3);

// Start churning.
qpu.drawLoop(() => {
    let generatedEntropy = qpu.measureQubit(0);
    if (Math.random() < 0.3) {
        generatedEntropy = !generatedEntropy; // Mix it up some more.
    }
    if (generatedEntropy) {
        qpu.applyOperation(SMALL_Y_ROT_1);
        qpu.applyOperation(X0);
    }
    qpu.applyOperation(H0);

    qpu.applyOperation(SMALL_X_ROT_2_WHEN_1);
    qpu.applyOperation(CNOT_2_ONTO_3);
    qpu.applyOperation(CONFOUNDING_X3);
    let measureResult = qpu.measureQubit(3);
    if (measureResult) {
        qpu.applyOperation(X3); // Clear.
    }
});
