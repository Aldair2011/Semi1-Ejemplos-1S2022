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
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');




// se manda a llamar las credenciales de Mysql 
const db_credentials = require('./db_creds');
var conn = mysql.createPool(db_credentials);

//Se inicializa el sdk para menejar los servicios de AWS 
var AWS = require('aws-sdk');

//instanciamos los servicios a utilizar con sus respectivos accesos.
const s3 = new AWS.S3(aws_keys.s3);
const ddb = new AWS.DynamoDB(aws_keys.dynamodb);
const rek = new AWS.Rekognition(aws_keys.rekognition);
const translate = new AWS.Translate(aws_keys.translate);
const cognito = new AmazonCognitoIdentity.CognitoUserPool(aws_keys.cognito);


//*********************************************ALMACENAMIENTO****************************************************
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

//----------------------------------- Inteligencia Artificial Rekognition ---------------------------------------


// Analizar Emociones Cara
app.post('/detectarcara', function (req, res) { 
    var imagen = req.body.imagen;
    var params = {
      /* S3Object: {
        Bucket: "mybucket", 
        Name: "mysourceimage"
      }*/
      Image: { 
        Bytes: Buffer.from(imagen, 'base64')
      },
      Attributes: ['ALL']
    };
    rek.detectFaces(params, function(err, data) {
      if (err) {res.json({mensaje: "Error"})} 
      else {   
             res.json({Deteccion: data});      
      }
    });
  });
  // Analizar texto
  app.post('/detectartexto', function (req, res) { 
    var imagen = req.body.imagen;
    var params = {
      /* S3Object: {
        Bucket: "mybucket", 
        Name: "mysourceimage"
      }*/
      Image: { 
        Bytes: Buffer.from(imagen, 'base64')
      }
    };
    rek.detectText(params, function(err, data) {
      if (err) {res.json({mensaje: "Error"})} 
      else {   
             res.json({texto: data.TextDetections});      
      }
    });
  });
  // Analizar Famoso
  app.post('/detectarfamoso', function (req, res) { 
    var imagen = req.body.imagen;
    var params = {
      /* S3Object: {
        Bucket: "mybucket", 
        Name: "mysourceimage"
      }*/
      Image: { 
        Bytes: Buffer.from(imagen, 'base64')
      }
    };
    rek.recognizeCelebrities(params, function(err, data) {
      if (err) {
        console.log(err);
        res.json({mensaje: "Error al reconocer"})} 
      else {   
             res.json({artistas: data.CelebrityFaces});      
      }
    });
  });
  // Obtener Etiquetas
  app.post('/detectaretiquetas', function (req, res) { 
    var imagen = req.body.imagen;
    var params = {
      /* S3Object: {
        Bucket: "mybucket", 
        Name: "mysourceimage"
      }*/
      Image: { 
        Bytes: Buffer.from(imagen, 'base64')
      }, 
      MaxLabels: 123
    };
    rek.detectLabels(params, function(err, data) {
      if (err) {res.json({mensaje: "Error"})} 
      else {   
             res.json({texto: data.Labels});      
      }
    });
  });
  // Comparar Fotos
  app.post('/compararfotos', function (req, res) { 
    var imagen1 = req.body.imagen1;
    var imagen2 = req.body.imagen2;
    var params = {
      
      SourceImage: {
          Bytes: Buffer.from(imagen1, 'base64')     
      }, 
      TargetImage: {
          Bytes: Buffer.from(imagen2, 'base64')    
      },
      SimilarityThreshold: '80'
      
     
    };
    rek.compareFaces(params, function(err, data) {
      if (err) {res.json({mensaje: err})} 
      else {   
             res.json({Comparacion: data.FaceMatches});      
      }
    });
  });
  
  //----------------------------------------Inteligencia Artificial Amazon Translate---------------------------------------------------------

app.post('/translate', (req, res) => {
  let body = req.body

  let text = body.text

  let params = {
    SourceLanguageCode: 'auto',
    TargetLanguageCode: 'es',
    Text: text || 'Hello there'
  };
  translate.translateText(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
      res.send({ error: err })
    } else {
      console.log(data);
      res.send({ message: data })
    }
  });
});

//Amazon Cognito

app.post("/api/login", async (req, res) => {
  var crypto = require('crypto');
  var hash = crypto.createHash('sha256').update(req.body.password).digest('hex');
  var authenticationData = {
      Username: req.body.username,
      Password: hash+"D**"
  };
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
      authenticationData
  );
  var userData = {
      Username: req.body.username,
      Pool: cognito,
  };
  var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');

  cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
          // User authentication was successful
          res.json(result); //
      },
      onFailure: function (err) {
          // User authentication was not successful
          res.json(err);
      },
      mfaRequired: function (codeDeliveryDetails) {
          // MFA is required to complete user authentication.
          // Get the code from user and call
          cognitoUser.sendMFACode(verificationCode, this);
      },
  });
});

app.post("/api/signup", async (req, res) => {
  var attributelist = [];

  var dataname = {
      Name: 'name',
      Value: req.body.name,
  };
  var attributename = new AmazonCognitoIdentity.CognitoUserAttribute(dataname);

  attributelist.push(attributename);

  var dataemail = {
      Name: 'email',
      Value: req.body.email,
  };
  var attributeemail = new AmazonCognitoIdentity.CognitoUserAttribute(dataemail);

  attributelist.push(attributeemail);

  var datacarnet = {
      Name: 'custom:carnet',
      Value: req.body.carnet+"",
  };
  var attributecarnet = new AmazonCognitoIdentity.CognitoUserAttribute(datacarnet);

  attributelist.push(attributecarnet);

  var crypto = require('crypto');
  var hash = crypto.createHash('sha256').update(req.body.password).digest('hex');
  console.log(attributelist);

  cognito.signUp(req.body.username, hash+"D**", attributelist, null, async (err, data) => {
      
      if (err) {
          console.log(err);

          res.json(err.message || err);
          return;
      }
      console.log(data);
      res.json(req.body.username+' registrado');
  });
});
