var express = require('express')
var router = express.Router()
var mongo = require('mongodb')
var jwt_decode = require('jwt-decode')
var chargebee = require('chargebee')
const verifyToken = require('../../middlewares/verifyToken')
const isCompany = require('../../middlewares/isSeller')
const isAdmin = require('../../middlewares/isAdmin')
const companyController = require('./companyController')
const { catchErrors } = require('../../helpers/errorHandlers')
const isSeller = require('../../middlewares/isSeller')
const isSellerOrIsComptable = require('../../middlewares/isSellerOrIsComptable')

const yup = require('yup')
const validate = require('../../middlewares/validate')
require('dotenv').config()

/*
  Retourne une company en fonction d'un domaine (cherche dans la bdd)
*/
router.get('/find', async (req, res, next) => {
  const client = req.app.locals.client
  const db = client.db('harx')
  if (!db) {
    return res.status('405').send('Db is null')
  }
  const companyCollection = db.collection('companies')

  if (!req.query.domain) {
    return res.status('405').send('error, verrifier les parametres.')
  }

  let company = await companyCollection.findOne({ domain: req.query.domain })
  if (company) {
    return res.send(company)
  } else {
    return res.send('there is no company for this domain')
  }
})

/*
  Crée un compte chargeBe avec l'adresse mail de l'enregistrement
*/
router.post('/create_chargeBe', async (req, res, next) => {
  const client = req.app.locals.client
  const db = client.db('harx')
  if (!db) {
    return res.status('405').send('Db is null')
  }
  if (req.body.token) {
    return res.status('405').send('Verifier le token')
  }

  const usersCollection = db.collection('companies')

  let token = req.body.token
  let decoded = jwt_decode(token)

  let user = await usersCollection.findOne({ email: decoded.email })

  chargebee.configure({
    site: 'harxai-test',
    api_key: 'test_lOGJA2l9OFWgo9JW0mtAbYDgDwyEFZRZ',
  })
  chargebee.customer
    .create({
      first_name: req.body.firstname,
      last_name: req.body.lastname,
      email: user.email,
    })
    .request(function (error, result) {
      if (error) {
        //handle error
        console.log(error)
        return res.send('error')
      } else {
        console.log(result)
        return res.send('ok')
      }
    })
})

/*
  Delete dans la bdd un entreprise pour un _id donné
*/
// router.delete('/:id', async (req, res) => {
//   const client = req.app.locals.client;
//   const db = client.db('harx')
//   if (!db){
//     return res.status("405").send("Db is null")
//   }
//   const companyCollection = db.collection('companies')

//   if(!req.params.id){
//     return res.status("405").send("Verifiez les paramètres.")
//   }

//   var o_id = new mongo.ObjectID(req.params.id);
//   let user = await companyCollection.findOne({ _id: o_id})
//   console.log(user)
//   if(!user){
//    return res.send("User don't exist")
//   }

//   companyCollection.remove({_id: o_id})
//   return res.send("User delete")
// });

/*
  Insère dans la bdd toutes les informations concernant une entreprise
*/
router.post('/form_company', async (req, res) => {
  const client = req.app.locals.client
  const db = client.db('harx')
  if (!db) {
    return res.status('405').send('Db is null')
  }
  const usersCollection = db.collection('companies')

  if (!req.body.token) {
    return res.status('405').send('Verifier le token')
  }

  let token = req.body.token
  let decoded = jwt_decode(token)

  let user = await usersCollection.findOne({ email: decoded.email })

  if (!user) {
    return res.status(400).send('No user for ' + decoded.email)
  }

  usersCollection.updateOne(
    { email: decoded.email },
    {
      $set: {
        type_compte: req.body.type_account,
        team_size: req.body.team_size,
        team_name: req.body.team_name,
        account_plan: req.body.account_plan,
        sirret: req.body.sirret,
        siren: req.body.sirren,
        form_juridique: req.body.form_juridique,
        adress: req.body.adress,
        zip: req.body.zip,
        tva: req.body.tva,
        sector_activity: req.body.sector_activity,
        description_activity: req.body.description_activity,
        email_contact: req.body.email_contact,
      },
    }
  )

  return res.status(200).send('Ok')
})





router.put('/', verifyToken, isCompany, catchErrors(companyController.updateSeller))


router.get('/wallet-amount', verifyToken, isSellerOrIsComptable, catchErrors(companyController.walletAmount))




router.get('/:id', verifyToken, catchErrors(companyController.show))

const updateCompanyFiche = yup.object({
  body: yup.object({
    activity_description: yup.string().nullable(),
    client_cible_b2b: yup.bool().nullable(),
    client_cible_b2c: yup.bool().nullable(),
    marche_cible: yup.string().oneOf([null, 'MONDE', 'AMERIQUE', 'EUROPE', 'MIDDLE_EAST', 'ASIE', 'AFRIQUE', 'MAGHREB']).nullable(),
    mark_or_commercial: yup.object().nullable(),
    representant: yup.object().nullable(),
    countries: yup.array().of(yup.string()).nullable(),
    clients_countries: yup.array().of(yup.string()).nullable(),
    currencies: yup.array().of(yup.string()).nullable(),
    social_media: yup.array().of(yup.object()).nullable(),
  }),
})
router.put('/update-company-fiche', verifyToken, validate(updateCompanyFiche), isCompany, 
                                          catchErrors(companyController.updateCompanyFiche))


router.get('/', verifyToken, catchErrors(companyController.index))

router.post('/', verifyToken, catchErrors(companyController.store))


router.put('/', verifyToken, catchErrors(companyController.update))


router.delete('/:id', verifyToken, catchErrors(companyController.destroy))



router.put('/admin', verifyToken, isAdmin, catchErrors(companyController.updateByAdmin))



router.get('/admin/statistics/:period', verifyToken,isAdmin,catchErrors(companyController.getCompaniesStatistics));


router.get('/admin/createdByPeriod/:period', verifyToken,isAdmin,catchErrors(companyController.getCompaniesByPeriod));


router.get('/admin/companies', verifyToken, isAdmin,catchErrors(companyController.getCompanies));

 
router.put('/admin', verifyToken, isAdmin, catchErrors(companyController.updateByAdmin))


router.get('/admin/listcompanycsv', verifyToken, isAdmin, catchErrors(companyController.listCompanyCsv))

module.exports = router