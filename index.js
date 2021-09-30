process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const pdfParser = require('pdf-parser');
const downloadEmailAttachments = require('download-email-attachments');
const fs = require('fs');

const config = require('./config.json');

// Tous les jours check les mails
// Si le nom qu'on obtient == le nom dans la config
// rien faire
// Sinon on dl le nouveau, on remplace le nom dans la conf, on parse et on envoie le code
// ------------- OU -------------
// Tous les jours on check les mails
// On dl le dernier pdf, on met son nom dans la conf (même si c'est le même), on le parse
// Si le code qu'on vient d'obtenir != code dans la config
// rien faire
// Sinon on envoie le code sur discord
// A la fin supprimer tous les pdf téléchargés

// Suite du programme, elle s'exécute après dlPdf()
var nextPart = function(result) {
    if(result.error){
        console.error(result.error);
        return
    }
    console.log("Done");
    console.log(result.latestTime);

    const configData = JSON.parse(fs.readFileSync('./config.json'));

    var PDF_PATH = `${configData.lastFactureName}`;

    pdfParser.pdf2json(PDF_PATH, function(err, pdf) {
        if(err != null){
            console.error(err);
        }
        else {
            var page = pdf["pages"][0]["texts"];
            page.forEach(element => {
                if(element.text.startsWith("Le code")){
                    const configData = JSON.parse(fs.readFileSync('./config.json'));

                    preCode = element.text.split(": ");
                    code = preCode[1].split(' ');
                    console.log("Le code est : " + code[0]);

                    if(code[0] != configData.lastCode){
                        configData.lastCode = code[0];
                        fs.writeFileSync('./config.json', JSON.stringify(configData, null, 4));

                        console.log("Nouveau msg Discord avec le code");
                        // envoyer un message sur discord
                    }
                    else {
                        console.log("Le code n'a pas changé donc pas de mess");
                    }
                    
                }
            })
        }
    })
};

// Fonction qui download le dernier pdf
function dlPdf(){
    downloadEmailAttachments({
        account: `"${config.email}":"${config.password}"@${config.host}:${config.port}`,
        filenameTemplate: '{nr}-{filename}',
        filenameFilter: /.pdf?$/,
        timeout: 3000,
        since: "2021-09-27",
        log: {warn: console.warn, debug: console.debug, error: console.error, info: console.info},
        attachmentHandler: function(attachmentData, callback){
            console.log(attachmentData);

            const configData = JSON.parse(fs.readFileSync('./config.json'));
            fullFactureName = attachmentData['generatedFileName'];
            listFactureName = fullFactureName.split('-');
            factureName = listFactureName[1];

            if(factureName.startsWith("Facture")){
                configData.lastFactureName = fullFactureName;
                fs.writeFileSync('./config.json', JSON.stringify(configData, null, 4));
            }
            
            callback();
        },
    }, nextPart);
};

// Début du programme avec le lancement de la fonction dlPdf()
dlPdf();







// fs.unlinkSync(PDF_PATH);