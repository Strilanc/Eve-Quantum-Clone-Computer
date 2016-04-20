# Eve's Quantum Clone Computer

A toy demo of a quantum state being inferred by Eve as she performs actions requested by Alice.

[![Build Status](https://travis-ci.org/Strilanc/Eve-Quantum-Clone-Computer.svg?branch=master)](https://travis-ci.org/Strilanc/Eve-Quantum-Clone-Computer)

Most of the math and drawing code was lifted from [Quirk](https://github.com/Strilanc/Quantum-Circuit-Inspector).

All Eve does is start with a classically-stored maximally mixed density matrix, apply any requested operations onto that  inferred density matrix (and also onto the true state in the hypothetical actual quantum computer), and post-select the inferred density matrix to match the results of any requested measurements.
Sometimes the measurement results are very informative, sometimes not informative at all, but gradually the details relevant to accurately predicting future measurement probabilities are incorporated into the inferred state.

Eve's inferrence process is exponentially expensive in the number of qubits, taking Θ(4ⁿ) time per operation due to the need to operate on the inferred density matrix classically. The process becomes impractal after a dozen qubits, and truly intractable by fifty qubits.

# Example

A state being inferred:

![Quantum teleportation](/README_demo.gif)

The program that Eve was running on Alice's behalf:

    // [... defining gates ...]

    while (true) {
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
    }

# Building

1. Have [git](https://git-scm.com/) and [Node.js](https://nodejs.org/en/download/) installed.

    `sudo add-apt-repository universe`
    
    `sudo apt-get update`
    
    `sudo apt-get install --yes git npm nodejs-legacy`

2. Clone the repository.

    `git clone https://github.com/Strilanc/Eve-Quantum-Clone-Computer.git`

3. Install the dev dependencies.

    `cd Eve-Quantum-Clone-Computer`
    
    `npm install`

4. (*Optional*) Run the tests.

    `npm run test-firefox`

5. Build the output files.

    `npm run build`

6. Open `out/index.html` in a browser.

    `firefox out/index.html`
