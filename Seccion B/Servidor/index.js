var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const cors = require('cors');

var corsOptions = { origin: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))



app.get('/', function (req, res ) {

    res.json({messaje: 'Hola Seminario'})

})

var port = 9000;
app.listen(port);
console.log("Escuchando en el puerto", port)
