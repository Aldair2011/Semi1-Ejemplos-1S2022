var express = require('express');
var bodyParser = require('body-parser');
var app = express();

const cors = require('cors');

//se importan las librerias y las credenciales 
const mysql = require('mysql');
const aws_keys = require('./cresd');


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




// se manda a llamar las credenciales de Mysql 
const db_credentials = require('./db_creds');
var conn = mysql.createPool(db_credentials);

//Se inicializa el sdk para menejar los servicios de AWS 
var AWS = require('aws-sdk');

//instanciamos los servicios a utilizar con sus respectivos accesos.
const s3 = new AWS.S3(aws_keys.s3);
const ddb = new AWS.DynamoDB(aws_keys.dynamodb);



// ruta que se usa para subir una foto 

app.post('/subirfoto', function (req, res) {

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
    var nombrei = "fotos/" + id + ".jpg";

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

    S3.getObject(getParams, function (err, data) {
        if (err) {
            res.json(error)
        } else {
            var dataBase64 = Buffer.from(data.Body).toString('base64'); //resgresar de byte a base
            res.json({ mensaje: dataBase64 })
        }

    })

});

/***************************BASE DE DATOS ************** */
///DYNAMO 
//subir foto y guardar en dynamo
app.post('/saveImageInfoDDB', (req, res) => {
    let body = req.body;

    let name = body.name;
    let base64String = body.base64;
    let extension = body.extension;

    //Decodificar imagen
    let encodedImage = base64String;
    let decodedImage = Buffer.from(encodedImage, 'base64');
    let filename = `${name}.${extension}`; 

    //Parámetros para S3
    let bucketname = 'tempbucket0001';
    let folder = 'fotos/';
    let filepath = `${folder}${filename}`;
    var uploadParamsS3 = {
        Bucket: bucketname,
        Key: filepath,
        Body: decodedImage,
        ACL: 'public-read', // ACL -> LE APLICA LA POLITICA AL OBJETO QUE SE ESTA GUARDANDO
    };

    s3.upload(uploadParamsS3, function sync(err, data) {
        if (err) {
            console.log('Error uploading file:', err);
            res.send({ 'message': 's3 failed' })
        } else {
            console.log('Upload success at:', data.Location);
            ddb.putItem({
                TableName: "ejemplosemidy", // el nombre de la tabla de dynamoDB 
                Item: {
                    "id": { S: "3" },
                    "name": { S: name },
                    "location": { S: data.Location }
                }
            }, function (err, data) {
                if (err) {
                    console.log('Error saving data:', err);
                    res.send({ 'message': 'ddb failed' });
                } else {
                    console.log('Save success:', data);
                    res.send({ 'message': 'ddb success' });
                }
            });
        }
    });
})


/******************************RDS *************/
//obtener datos de la BD
app.get("/getdata", async (req, res) => {
    conn.query(`SELECT * FROM ejemplo`, function (err, result) {
        if (err) throw err;
        res.send(result);
    });
});

//insertar datos
app.post("/insertdata", async (req, res) => {
    let body = req.body;
    conn.query('INSERT INTO ejemplo VALUES(?,?)', [body.id, body.nombre], function (err, result) {
        if (err) throw err;
        res.send(result);
    });
});