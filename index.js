process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var Imap = require('imap'), inspect = require('util').inspect;
var pdfParser = require('pdf-parser');  
const {forEach} = require('lodash');

var imap = new Imap({
    user: "rem.mazzone@orange.fr",
    password: "",
    host: "imap.orange.fr",
    servername: "imap.orange.fr",
    port: 993,
    tls: true
});

var PDF_PATH = "facture.pdf";

pdfParser.pdf2json(PDF_PATH, function(err, pdf) {
    if(err != null){
        console.error(err);
    }
    else {
        var page0 = pdf["pages"][0];

    }
})

function openInbox(cb){
    imap.openBox('INBOX', true, cb);
    return
}

imap.once('ready', function(){
    openInbox(function(err, box){
        if(err) throw err;
        imap.search([['FROM', 'ne-pas-repondre@cap-etudes.com']], function(err, results){
            if(err) throw err;
            var f = imap.fetch(results, {bodies: ''});
            f.once('message', function(msg, seqno){
                console.log("Message #%d", seqno);
                var prefix = '(#' + seqno + ')';
                msg.on('body', function(stream, info){
                    var buffer = '';
                    stream.on('data', function(chunk){
                        buffer += chunk.toString('utf-8');
                    });
                    stream.once('end', function() {
                        console.log(prefix + 'Parse header : %s', inspect(Imap.parseHeader(buffer)));
                    });
                });
                msg.once('end', function(){
                    console.log(prefix + 'Finished');
                });
            });
            f.once('error', function(err){
                console.error('Fetch error : ' + err);
            });
            f.once('end', function(){
                console.log('Done fetching all messages');
                imap.end();
            });
        });
    });
});

imap.once('error', function(err){
    console.error(err);
});

imap.once('end', function(){
    console.log('Connection ended');
});

imap.connect();