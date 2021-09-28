var Imap = require('imap'), inspect = require('util').inspect;
var pdfParser = require('pdf-parser');

var imap = new Imap({
    user: "your_email",
    password: "your_password",
    host: "imap.host.com",
    servername: "imap.host.com",
    port: 993,
    ssl: true
});

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

function openInbox(cb){
    imap.openBox('INBOX', true, cb);
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