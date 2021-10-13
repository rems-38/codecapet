// Nécessaire pour se connecter au serveur mail sans problème
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Constante pour le bot Discord
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

// Les outils qu'on utilise dans ce code
const pdfParser = require('pdf-parser');
const downloadEmailAttachments = require('download-email-attachments');
const fs = require('fs');
const schedule = require('node-schedule');

// Importation du fichier de configuration
const config = require('./config.json');


// Fonction qui envoie un message Discord le jour où le code change
function codeChangeMessage(code){
    // On envoie donc un message comme quoi le code à désormais changé, et on rappel quel est le nouveau code
    userDiscord.send("C'est aujourd'hui que le code change ! (rappel, c'est donc " + code[0]);
};

// /!\ Suite du programme, ça s'exécute après dlPdf()
var nextPart = function(result) {
    // On vérifie qu'on sort de dlPdf() sans erreur
    if(result.error){
        console.error(result.error);
        return
    }
    console.log("Done");
    console.log(result.latestTime);

    // On importe la configuration courante (sachant qu'on vient de la modifier dans dlPdf(), utiliser l'importation de la l15 ne fonctionne pas car elle a encore l'ancienne valeur en mémoire)
    const configData = JSON.parse(fs.readFileSync('./config.json'));

    // Variable qui contient le nom du PDF qu'on veut parser, c'est le dernier de la liste, qui est bien un PDF de la facture de Cap'Etudes
    var PDF_PATH = `${configData.lastFactureName}`;

    // Fonction pour parser le fichier PDF
    pdfParser.pdf2json(PDF_PATH, function(err, pdf) {
        // On vérifie qu'on a pas d'erreur
        if(err != null){
            console.error(err);
        }
        else {
            // On récupère toutes les chaines de caractères de la page du PDF
            var page = pdf["pages"][0]["texts"];

            // On fait une boucle pour trouver le bon élement (la ligne qui contient le code)
            page.forEach(element => {
                if(element.text.startsWith("Le code")){
                    // On réimporte la configuration courante car elle n'est pas définie dans cette fonction (elle est définie plus haut)
                    const configData = JSON.parse(fs.readFileSync('./config.json'));

                    // On met en forme la ligne pour avoir juste le code (et pas le texte avant)
                    phrase = element.text;

                    preDate = phrase.split('/');
                    date = [preDate[0].slice(-2), preDate[1], preDate[2].slice(0, 4)];
                    
                    preCode = pharse.split(': ');
                    code = preCode[1].split(' ');
                    console.log("Le code est : " + code[0]);

                    // Si le code a changé par rapport au jour précédent (si on a reçu un nouveau mail)
                    if(code[0] != configData.lastCode){
                        // On change la valeur du code dans la configuration par la valeur du nouveau code 
                        configData.lastCode = code[0];
                        // Et on l'enregistre dans la fichier json
                        fs.writeFileSync('./config.json', JSON.stringify(configData, null, 4));

                        console.log("Nouveau msg Discord avec le code");
                        
                        // On envoie donc la phrase complète avec le code (choix personnel) en mp Discord (c'est le bot qui nous envoi le message) 
                        userDiscord.send(element.text);

                        // Constante qui attends le jour où le code change pour envoyer l'info sur Discord
                        const waitDateCodeChange = schedule.scheduleJob({date: date[0], month: date[1] - 1, year: date[2]}, () => {
                            codeChangeMessage(code);
                        });
                        // On appelle la constante pour attendre le jour où le code change
                        waitDateCodeChange;
                    }
                    else {
                        console.log("Le code n'a pas changé donc pas de mess");
                    }

                    // On supprime les fichiers PDF qu'on a téléchargé pour qu'il retélécharge bien tout la prochaine fois (et qu'il n'y ait pas d'erreur/de conflit)
                    fs.readdir(__dirname, (err, files) => {
                        files.forEach(file => {
                            if(file.endsWith('.pdf')){
                                fs.unlinkSync(file);
                            }
                        });
                    });
                }
            })
        }
    })
};

// Fonction qui download tous les PDF reçus
function dlPdf(){
    downloadEmailAttachments({
        // On configure le compte avec les infos présentes dans la config 
        account: `"${config.email}":"${config.password}"@${config.host}:${config.port}`,
        // On enregistre le fichier sous le format 1-nom_pdf_1, puis 2-nom_pdf_2, etc
        filenameTemplate: '{nr}-{filename}',
        // On filtre les pièces jointes des emails pour ne télécharger que les PDF
        filenameFilter: /.pdf?$/,
        timeout: 3000,
        // On définit une date de base
        since: "2021-09-27",
        log: {warn: console.warn, debug: console.debug, error: console.error, info: console.info},
        attachmentHandler: function(attachmentData, callback){
            console.log(attachmentData);

            // On importe le fichier de configuration courant car on va devoir lui apporter des modifications
            const configData = JSON.parse(fs.readFileSync('./config.json'));
            // On récupère le nom du fichier au format 1-nom_pdf_1
            fullFactureName = attachmentData['generatedFileName'];
            // On crée une liste pour séparer l'id et le nom du PDF
            listFactureName = fullFactureName.split('-');
            // On met uniquement le nom du PDF dans une variable
            factureName = listFactureName[1];

            // Ce qui permet de vérifier que le fichier en question commence bien par "Facture" (avec l'id on n'aurait pas pu c'est pour cela qu'on l'enlève avec les 3 lignes au-dessus)
            if(factureName.startsWith("Facture")){
                // On change la valeur du nom de la facture dans la configuration et on le remplace pour notre nouveau nom de fichier 
                configData.lastFactureName = fullFactureName;
                // On enregistre le fichier json
                fs.writeFileSync('./config.json', JSON.stringify(configData, null, 4));
            }
            
            callback();
        },
    // On appelle nextPart (présent au début du code) pour passer à la suite une fois que cette fonction a finit de s'exécuter, sinon le reste s'exécute en parallèle et ça pose problème car on n'a pas encore de fichier PDF à parser, car ils n'ont pas encore été téléchargés
    }, nextPart);
};

// On attends que le bot Discord soit bien connecté
client.on('ready', async() => {
    console.log('Bot Discord Ready');
    // On récupère les infos sur notre utilisateur Discord
    userDiscord = await client.users.fetch(config.discordUserID);
    // On crée la possibilité de nous envoyer un mp (que le bot nous envoie un message privé)
    userDiscord.createDM();
});

// On lance la procédure de login du bot Discord
client.login(config.tokenBotDiscord);

// Constante pour lancer le programme (via la fonction dlPdf() qui commence le programme) tous les jours à 00h00
const job = schedule.scheduleJob({hour: 00, minute: 00}, () => {
    dlPdf();
});

// On appelle la constante pour attendre qu'il soit minuit (on démarre le programme) 
job;
