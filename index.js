process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

var pdfParser = require('pdf-parser');
var downloadEmailAttachments = require('download-email-attachments');

var config = require('./config.json');

var onEnd = function(result) {
    if(result.error){
        console.error(result.error);
        return
    }
    console.log("Done");
    console.log(result.latestTime);
};

downloadEmailAttachments({
    account: `"${config.email}":"${config.password}"@${config.host}:${config.port}`,
    filenameTemplate: 'facture.pdf',
    filenameFilter: /.pdf?$/,
    timeout: 3000,
    since: "2021-09-30",
    log: {warn: console.warn, debug: console.info, error: console.error, info: console.info},
    attachmentHandler: function(attachmentData, callback, errorCB){
        console.log(attachmentData);
        callback();
    },
}, onEnd);

var PDF_PATH = "facture.pdf";

pdfParser.pdf2json(PDF_PATH, function(err, pdf) {
    if(err != null){
        console.error(err);
    }
    else {
        var page = pdf["pages"][0]["texts"];
        page.forEach(function(element){
            if(element.text.startsWith("Le code")){
                code = element.text.split(": ");
                console.log(code[1]);
            }
        })
    }
})
