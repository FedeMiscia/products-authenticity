require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config() // Import per leggere dal file .env
require("@nomiclabs/hardhat-etherscan") // Plugin per interagire con etherscan ed effettuare la verifica di un contratto
//require("./tasks/block-number.js") // Import dello script realizzato per definire un nuovo task block-number
//require("./tasks/accounts") // Import dello script che definsice il task per stamapre gli account della rete locale hardhat
require("hardhat-gas-reporter") // Import dell'estensione gas reporter utile per i test
//require("solidity-coverage") // Import richiesto per utilizzare il tool solidity-coverage (copertura del codice di un contratto da parte dei test)
require("hardhat-deploy") // Import del plugin per facilitare il tracking dei deploy e  il testing
// require("hardhat-contract-sizer")
// require("@nomiclabs/hardhat-waffle")

/** @type import('hardhat/config').HardhatUserConfig */

// Prendiamo l'RPC URL per la testnet Sepolia dalla variabile d'ambiente che abbiamo specificato in .env
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia"

// Prendiamo la chiave privata dal file .env (la chiave privata è quella dell'account 1 di metamask)
const PRIVATE_KEY = process.env.PRIVATE_KEY

// Preleviamo la chiave per chiamare l'API di etherscan8
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

// Preleviamo l'RPC URL per connettersi alla rete localhost. Ricavato con il comando yarn hardhat node
const LOCALHOST_RPC_URL = process.env.LOCALHOST_RPC_URL

const GANACHE_RPC_URL = process.env.GANACHE_RPC_URL

// Preleviamo la chiave per connettersi all'API coinmarketcap
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

module.exports = {
    defaultNetwork: "hardhat", //rete utilizzata di default quando lanciamo yarn hardhat run scripts/deploy.js (o yarn hardhat deploy)
    // Nella sezione seguente impostiamo dei parametri nel caso in cui vogliamo fare il deploy su una rete di test reale (sepolia) anziché sulla rete locale di hardhat
    networks: {
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY], // Lista di account, qui ne indichiamo solo uno a partire dalla chiave privata
            chainId: 11155111, // Visto dal sito Chainlist.org
            blockConfirmations: 6, // Possiamo impostare direttamente da qui il numero di conferme da attendere per ogni rete con cui lavoriamo
        },
        localhost: {
            url: LOCALHOST_RPC_URL,
            // accounts: non dobbiamo fornirli, lo fa Hardhat dietro le quinte
            chainId: 31337, // Anche se è considerata una rete a sè stante, ha lo stesso chainId della rete di default hardhat
            blockConfirmations: 1,
        },
        ganache: {
            url: GANACHE_RPC_URL,
            chainId: 1337,
            blockConfirmations: 1,
        },
    },
    // Definiamo la possibilità di compilare per versioni multiple di solidity in modo da non avere problemi con il MockV3Aggregator
    solidity: {
        compilers: [{ version: "0.8.18" }, { version: "0.6.6" }],
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true, // True: abilitiamo il calcolo del gas report
        outputFile: "gas-report.txt", // Il prospetto sul consumo di gas non verrà fornito su terminale ma su un file a parte
        noColors: true,
        currency: "USD", // Impostiamo la valuta in modo che qunado lanciamo il test ci venga fornito anche il costo in temrini monetari associato alle funzioni o al deploy
        //coinmarketcap: COINMARKETCAP_API_KEY, // Tramite l'API coinmarketcap otteniamo dati sul cambio (la chiave è stata presa dal profilo utente su coinmarketcap/api)
        //token: ci permette di impostare la blockchain sulla quale basare il gas report (vedere documentazione hardhat-gas-reporter)
    },
    namedAccounts: {
        deployer: {
            // Un primo account lo chiamiamo deployer perché lo vogliamo destinare al deploy del contratto
            default: 0, // Stabiliamo che, utilizzando la rete di default hardhat, l'account deployer sia l'account 0
            31337: 0, // In questo modo diciamo che nella rete con Id 31337 (localhost) l'account deployer sarà l'account 0. Per ogni rete possiamo stabilire l'account che sarà il deployer
            1337: 0,
            11155111: 0,
        },
        user: {
            default: 1,
            31337: 1,
        },
        user2: {
            default: 2,
        },
    },
}
