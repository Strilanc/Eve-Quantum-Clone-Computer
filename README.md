# Eve's Quantum Clone Computer

A toy demo of a quantum state being inferred by Eve as she performs actions requested by Alice.

[![Build Status](https://travis-ci.org/Strilanc/Eve-Quantum-Clone-Computer.svg?branch=master)](https://travis-ci.org/Strilanc/Eve-Quantum-Clone-Computer)

Most of the behind-the-scenes code was lifted from [Quirk](https://github.com/Strilanc/Quantum-Circuit-Inspector).

Basically all Eve does is match the requested operations onto a density matrix being computed classically.
This is **exponentially expensive** in the number of qubits, but works fine for small systems.

# A state being inferred:

![Quantum teleportation](/README_demo.gif)

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
