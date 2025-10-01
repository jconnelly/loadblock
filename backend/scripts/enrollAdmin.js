/**
 * Import Admin Identity from Test Network
 *
 * This script imports the admin identity from the test-network MSP directory
 * into a wallet that the backend application can use to submit transactions.
 */

const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function importAdmin() {
    try {
        // Create a new file system based wallet for managing identities
        const walletPath = path.join(__dirname, '..', 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if admin already exists in wallet
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Path to the admin MSP in the test-network
        // This works for both WSL and Windows if fabric-samples is in home directory
        const isWSL = process.platform === 'linux' || fs.existsSync('/mnt/c');
        const fabricSamplesPath = isWSL
            ? path.join(process.env.HOME, 'fabric-samples')
            : path.join('\\\\wsl$\\Ubuntu\\home\\jerem\\fabric-samples');

        const credPath = path.join(
            fabricSamplesPath,
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'users',
            'Admin@org1.example.com',
            'msp'
        );

        // Read the certificate and private key
        const signcertsPath = path.join(credPath, 'signcerts');
        const certFiles = fs.readdirSync(signcertsPath);
        const certPath = path.join(signcertsPath, certFiles[0]);
        const certificate = fs.readFileSync(certPath, 'utf8');

        const keyPath = path.join(credPath, 'keystore');
        const keyFiles = fs.readdirSync(keyPath);
        const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');

        // Create the identity object
        const x509Identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Import the identity into the wallet
        await wallet.put('admin', x509Identity);
        console.log('Successfully imported admin identity into the wallet');
        console.log('Certificate path:', certPath);
        console.log('Identity MSP ID:', x509Identity.mspId);

    } catch (error) {
        console.error(`Failed to import admin identity: ${error}`);
        console.error('Make sure the test-network is running and has been initialized');
        process.exit(1);
    }
}

importAdmin();
