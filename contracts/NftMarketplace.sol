// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol"; // Import necessario per poter richiamare alcune funzioni che manipolano gli NFT, tra cui la funzione di approvazione per lavorare con un NFT e la funzione per trasferire un NFT
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; //Import necessario per il modifier nonReentrant

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

// Contratto che gestisce la compravendita di NFT. Ereditiamo da ReentrancyGuard per alcune funzionalità di sicurezza
contract NftMarketplace is ReentrancyGuard {
    // Struttura dati per tenere traccia di alcune informazioni sull'annuncio di vendita
    struct Listing {
        uint256 price; // prezzo dell'NFT
        address seller; // indirizzo del venditore
    }

    // Evento che sarà emesso dopo il listing di un NFT
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    // Evento emesso a seguito del completamento della funzione di acquisto
    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // Utilizziamo una struttura dati che effettua il seguente mapping:
    // Contract NFT address -> NFT Token Id -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // Mapping per tenere traccia di quanto ciascun utente deve incassare dalle vendite portate a termine
    // Seller address -> amount earned
    mapping(address => uint256) private s_proceeds;

    // Creiamo un modifier per assicurarci che non venga messo in vendita un NFT già listato in precedenza
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    // Modifier per fare in modo un NFT possa essere messo in vendita esclusivamente dal legittimo proprietario
    modifier onlyNftOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId); // La funzione ownerOf di IERC721 restituisce l'indirizzo del proprietario dell?NFT con l'id passato come parametro
        if (owner != spender) {
            //Se l'indirizzo del proprietario non corrisponde con l'indirizzo di chi sta tentando di mettere in vendita l'NFT facciamo il revert
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    // Modifier per verificare che un NFT è in lista di vendita. Verrà utilizzato nella funzione di acquisto
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId]; // preleviamo l'oggetto listing relativo all'address specificato e il token id
        if (listing.price <= 0) {
            // Se non è associato un prezzo all'NFT allora vuol dire che quell'NFT non è nel listino
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    /////////////////////
    // Main Functions //
    ////////////////////

    // La funzione per pubblicare un annuncio di vendita la definiamo come external perché vogliamo che possa essere richiamata anche da progetti esterni o account esterni
    // Dobbiamo assicurarci inoltre che l'NFT in questione non sia già stato messo in vendita precedentemente e che chi richiama la funzione sia effettivamente il proprietario dell'NFT. Queste due verifiche le facciamo tramite due modifiers
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId, msg.sender)
        onlyNftOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero(); // Bisogna impostare un prezzo coerente
        }
        // I proprietari di NFT mantengono comunque la proprietà dei propri NFT ma danno l'approvazione al marketplace di vendere l'NFT per loro conto.

        // Ci dobbiamo assicurare che il contratto marketplace ottenga l'approvazione per lavorare con l'NFT.
        // A tal proposito possiamo richiamare la funzione getApproved() dell'interfaccia IERC721 che abbiamo importato
        IERC721 nft = IERC721(nftAddress); // Creiamo un oggetto di tipo IERC721 passando all'interfaccia l'indirizzo del contratto relativo all'NFT da manipolare
        if (nft.getApproved(tokenId) != address(this)) {
            //Alla getApproved passiamo l'id del token. Se l'account approvato per manipolare il token con quell'id risulta diverso dall'account relativo al marketplace allora facciamo il revert
            revert NftMarketplace__NotApprovedForMarketplace();
        }

        s_listings[nftAddress][tokenId] = Listing(price, msg.sender); // Update del mapping con le informazioni richieste. Valorizziamo la struttura dati listing con il prezzo e l'indirizzo del venitore cioè colui che richiama la funzione
        emit ItemListed(msg.sender, nftAddress, tokenId, price); // Emissione dell'evento relativo al listing
    }

    //External perchè solamente persone o altri smart contract al di fuori di questo andranno a richiamare la funzione buyItem.
    //Payable in modo tale che le persone possano utilizzare della moneta per effettuare l'acquisto
    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable isListed(nftAddress, tokenId) nonReentrant {
        Listing memory listedItem = s_listings[nftAddress][tokenId]; //Ricaviamo il listing dell'NFT (cioè la struct contenente il prezzo e il venditore)
        if (msg.value < listedItem.price) {
            // Se la somma inviata con la transazione è inferiore al prezzo dell'NFT allora revert
            revert NftMarketplace__PriceNotMet(
                nftAddress,
                tokenId,
                listedItem.price
            );
        }

        // Se non ci sono problemi di importi procediamo all'aggiornamento della somma guadagnata dal venditore (cioè l'attuale proprietario del token)
        s_proceeds[listedItem.seller] += msg.value;

        // A questo punto dobbiamo eliminare l'annuncio di vendita dal mapping s_listings
        delete (s_listings[nftAddress][tokenId]); // La funzione delete permette di eliminare un entry da un mapping

        // Trasferimento del token dal venditore all'acquirente (cioè a chi sta richiamando la funzione corrente)
        // Per fare ciò utilizziamo la funzione safeTransferFrom di IERC721 a cui dobbiamo passare: from, to e tokenId
        IERC721(nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            tokenId
        );

        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    // Funzione per rimuovere un NFT dal marketplace.
    // Utilizziamo il modifer per assicurarci che solo il proprietario dell'NFT possa richiamare tale funzione
    // Utilizziamo il modifier per assicurarci che l?NFT da rimuovere sia stato precedentemente messo in vendita
    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
        external
        onlyNftOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCancelled(msg.sender, nftAddress, tokenId);
    }

    // Aggiornamento informazioni del Listing (prezzo di vendita)
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        onlyNftOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice); // Update = nuovo Listing
    }

    // Funzione tramite cui ogni venditore può ritirare quanto accumulato dalle vendite portate a termine
    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender]; // Ricaviamo la somma disponibile per il prelievo (quanto ottenuto fino a questo momento dalle vendite)
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        // Se la somma disponibile al ritiro è maggiore di 0 allora aggiornamento della struttura dati e invio dei soldi a chi ha richiamato la funzione
        s_proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    // Getters

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
