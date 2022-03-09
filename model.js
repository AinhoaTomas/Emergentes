const Realm = require('realm')


let IssuingSchema = {
  name: 'Issuing',
  primariKey: 'id',
  properties: {
    id: 'int',
    name: 'string',
    surname: 'string',
    email: 'string',
    passwd: 'string',
    wishes: 'Wish[]',
  }
}

let DonorSchema = {
    name: 'Donor',
    primariKey: 'id',
    properties: {
        id: 'int',
        name: 'string',
        surmane: 'string',
        email: 'string',
        passwd: 'string',
        wishes: 'Wish[]',
    }
}

let WishScheme = {
    name: 'Wish',
    primariKey: 'id',
    properties: {
        id: 'int',
        timestamp: 'date',
        name: 'string',
        description: 'string',
        price: 'int',
    }
}

let TransactionSchema = {
    name: 'Transaction',
    primariKey: 'id',
    properties: {
        id: 'int',
        timestamp: 'date',
        issuing: 'Issuing',
        donor: 'Donor',
        wish: 'Wish',
    }
}

// // // MODULE EXPORTS

let config = { path: './data/blogs.realm', schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema] }

exports.getDB = async() => await Realm.open(config)

// // // // // 

if (process.argv[1] == __filename) { //TESTING PART

    if (process.argv.includes("--create")) { //crear la BD

        Realm.deleteFile({ path: './data/blogs.realm' }) //borramos base de datos si existe

        let DB = new Realm({
            path: './data/blogs.realm',
            schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema]
        })

        DB.write(() => {

            let issuing = DB.create('Issuing', {id: 1, name: 'ainhoa', surname: 'tomas', email: 'correoAinhoa', passwd: '1234', wishes: []})

            let donor = DB.create('Donor', {id: 1, name: 'marc', surname: 'villanueva', email: 'correoMarc', passwd: '123', wishes: []})

            let wish = DB.create('Wish', {id: 1, timestamp: new Date(), name: 'Deseo 1', description: 'Descripcion', price: 12})

            let transaction = DB.create('Transaction', {id: 1, timestamp: new Date(), issuing: issuing, donor:donor, wish: wish})

            console.log('Inserted objects', issuing, donor, wish, transaction)
        })
        DB.close()

    } else { //consultar la BD

        Realm.open({ path: './data/blogs.realm', schema: [IssuingSchema, DonorSchema, WishScheme, TransactionSchema] }).then(DB => {
            let issuings = DB.objects('Issuing')
            issuings.forEach(x => console.log(x.name))
            let donors = DB.objects('Donor')
            donors.forEach(x => console.log(x.name))
            let wishes = DB.objects('Wish')
            wishes.forEach(x => console.log(x.name))
            let transactions = DB.objects('Transaction')
            if (transactions)
                console.log(transactions.id, 'by', transactions.donor.name, 'to', transactions.issuing.name, 'for', transactions.wish.name)
            DB.close()
        })
    }

}
