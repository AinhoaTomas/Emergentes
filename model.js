const Realm = require('realm')
const ObjectId = require('bson-objectid')

const app = new Realm.App({id: "application-realitywishes-igjfx"})

let IssuingSchema = {
  name: 'Issuing',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    _partition: 'string',
    name: 'string',
    surname: 'string',
    email: 'string',
    passwd: 'string',
    wishes: 'Wish[]',
  }
}

let DonorSchema = {
    name: 'Donor',
    primaryKey: '_id',
    properties: {
        _id: 'objectId',
        _partition: 'string',
        name: 'string',
        surname: 'string',
        email: 'string',
        passwd: 'string',
        wishes: 'Wish[]',
    }
}

let WishScheme = {
    name: 'Wish',
    primaryKey: '_id',
    properties: {
        _id: 'objectId',
        _partition: 'string',
        timestamp: 'date',
        name: 'string',
        description: 'string',
        price: 'float',
        issuing: 'Issuing',
    }
}

let TransactionSchema = {
    name: 'Transaction',
    primaryKey: '_id',
    properties: {
        _id: 'objectId',
        _partition: 'string',
        timestamp: 'date',
        issuing: 'Issuing',
        donor: 'Donor',
        wish: 'Wish',
        cant: 'float',
    }
}

// // // MODULE EXPORTS

const myPartitionKey = "myAppPartition"

let sync = {user: app.currentUser, partitionValue: myPartitionKey}

let config = { path: './data/blogs.realm',
                sync: sync,
                schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema]
}

exports.getDB = async () => {
    await app.logIn(new Realm.Credentials.anonymous())
    return await Realm.open(config)
}

exports.patitionKey = myPartitionKey
exports.app = app

// // // // // 

if (process.argv[1] == __filename) { //TESTING PART

    if (process.argv.includes("--create")) { //crear la BD

        Realm.deleteFile({ path: './data/blogs.realm' }) //borramos base de datos si existe

        app.logIn(new Realm.Credentials.anonymous()).then(() => {
            let DB = new Realm({
                path: './data/blogs.realm',
                sync: sync,
                schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema]
            })
            DB.write(() => {

                let issuing = DB.create('Issuing', {_id: ObjectId(), _partition: myPartitionKey, name: 'ainhoa', surname: 'tomas', email: 'correoAinhoa', passwd: '1234', wishes: []})

                let donor = DB.create('Donor', {_id: ObjectId(), _partition: myPartitionKey, name: 'marc', surname: 'villanueva', email: 'correoMarc', passwd: '123', wishes: []})

                let wish = DB.create('Wish', {_id: ObjectId(), _partition: myPartitionKey, timestamp: new Date(), name: 'Deseo 1', description: 'Descripcion', price: 12, issuing: issuing})

                let transaction = DB.create('Transaction', {_id: ObjectId(), _partition: myPartitionKey, timestamp: new Date(), issuing: issuing, donor:donor, wish: wish, cant: 10})

                console.log('Inserted objects', issuing, donor, wish, transaction)
            })
            DB.close()
        })
            .catch(err => console.log(err))



    } else { //consultar la BD

        Realm.open({ path: './data/blogs.realm', schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema] }).then(DB => {
            let issuings = DB.objects('Issuing')
            issuings.forEach(x => console.log(x.name, x.id))
            let donors = DB.objects('Donor')
            donors.forEach(x => console.log(x.name, x.id))
            /*let wishes = DB.objects('Wish')
            wishes.forEach(x => console.log(x.name, x.issuing.name, x.timestamp, x.price, x.issuing.id))
            let transaction = DB.objects('Transaction')
            transaction.forEach(x => console.log(x.id, x.donor.name, x.issuing.name, x.wish.name, x.cant))*/
            DB.close()
        })
    }

}
