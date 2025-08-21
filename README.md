# EthicalTrace

A blockchain-powered platform for tracking mineral supply chains, ensuring ethical sourcing and transparency from extraction to processing. Built with Clarity smart contracts, it addresses illegal mining, promotes fair trade, and supports the growing demand for responsibly sourced materials in industries like EV batteries.

---

## Overview

EthicalTrace leverages five main smart contracts to create a decentralized, transparent, and auditable system for mineral supply chain management:

1. **Batch Registry Contract** – Registers and tracks mineral batches (e.g., lithium, cobalt) from extraction to delivery.
2. **Certification Contract** – Manages certifications like “conflict-free” or “carbon-assessed” for ethical compliance.
3. **Provenance Log Contract** – Logs supply chain events (mining, refining, transport) for auditability.
4. **IoT Oracle Contract** – Integrates with mining equipment sensors for real-time data on extraction volumes.
5. **Governance Contract** – Enables stakeholders to propose and vote on updates to compliance protocols.

---

## Features

- **Batch tracking** with unique IDs for minerals from mine to market  
- **Ethical certifications** aligned with Responsible Minerals Initiative (RMI) standards  
- **Immutable provenance logs** for transparent auditing by regulators and buyers  
- **IoT integration** for real-time extraction data via oracles  
- **Stakeholder governance** for protocol updates and compliance enforcement  
- **Environmental impact tracking** with status codes like “carbon-assessed”  
- **Auditable supply chain** to combat illegal mining and ensure fair trade  

---

## Smart Contracts

### Batch Registry Contract
- Registers mineral batches with unique IDs
- Tracks batch details (origin, type, weight, timestamp)
- Transfers ownership across supply chain stages

### Certification Contract
- Issues certifications (e.g., “conflict-free,” “carbon-assessed”)
- Verifies compliance with RMI or custom standards
- Revokes certifications for non-compliance

### Provenance Log Contract
- Logs supply chain events (e.g., mined, refined, shipped)
- Provides immutable audit trail for regulators and buyers
- Queryable event history by batch ID

### IoT Oracle Contract
- Integrates with mining equipment sensors
- Records real-time extraction data (e.g., volume, location)
- Ensures data integrity with oracle verification

### Governance Contract
- Allows stakeholders to propose protocol updates
- Token-weighted voting for miners, processors, and regulators
- Enforces quorum and voting deadlines

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/ethicaltrace.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract operates independently but integrates with others for a complete supply chain tracking solution. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License

