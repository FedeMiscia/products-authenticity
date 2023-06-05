const { run } = require("hardhat")

// Verifying contract programmatically
async function verify(contractAddress, args) {
    console.log("Verifying contract...")
    // Dobbiamo richiamare la funzione run per eseguire il task hardhat di verifica.
    // Run la richiamiamo in un costrutto try-catch
    try {
        // Attivazione della funzione run: passiamo il task da eseguire e la lista con i parametri attuali (indirizzo del contratto, argomenti del costruttore)
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}

module.exports = { verify }
