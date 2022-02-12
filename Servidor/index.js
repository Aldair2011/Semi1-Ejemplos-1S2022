var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const cors = require('cors');

var corsOptions = { origin: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))


/*
app.get('/', function (req, res ) {

    res.json({messaje: 'Hola Seminario'})

})*/

var port = 9000;
app.listen(port);
console.log("Escuchando en el puerto", port)


//Se inicializa el sdk para menejar los servicios de AWS 
var AWS = require('aws-sdk');

// ruta que se usa para subir una foto 

app.post('/subirfoto', function (req, res){

    var id = req.body.id;
    var foto = req.body.foto;
    //carpeta y nombre que quieran darle a la imagen
  
    var nombrei = "fotos/" + id + ".jpg"; // fotos -> se llama la carpeta 
    //se convierte la base64 a bytes
    let buff = new Buffer.from(foto, 'base64');
  


    AWS.config.update({
        region: 'us-east-1', // se coloca la region del bucket 
        accessKeyId: '',
        secretAccessKey: ''
    });

    var s3 = new AWS.S3(); // se crea una variable que pueda tener acceso a las caracteristicas de S3
    // metodo 1
    const params = {
      Bucket: "ejemplosemi",
      Key: nombrei,
      Body: buff,
      ContentType: "image"
    };
    const putResult = s3.putObject(params).promise();
    res.json({ mensaje: putResult })

});

app.post('/obtenerfoto', function (req, res) {
    var id = req.body.id;
    var nombrei = "fotos/"+id+".jpg";

    AWS.config.update({
        region: 'us-east-1', // se coloca la region del bucket 
        accessKeyId: '',
        secretAccessKey: ''
    });

    var S3 = new AWS.S3();

    var getParams = 
    {
        Bucket: "ejemplosemi",
        Key: nombrei
    }

    S3.getObject(getParams, function(err, data){
        if (err)
        {
            res.json(error)
        }else
        {
            var dataBase64 = Buffer.from(data.Body).toString('base64'); //resgresar de byte a base
            res.json({mensaje: dataBase64})
        }

    })

});
