const { graphql, buildSchema } = require('graphql')

const model = require('./model') //Database

const jsonLD = require('./my-graph.json')

let DB
model.getDB().then(db => { DB = db })

const ObjectId = require('bson-objectid')

const sse = require('./utils/notifications') //Notifications
sse.start()


const schema = buildSchema(`
  type Query {
    hello: String
    issuings: [Issuing]
    donors: [Donor]
    wishes: [Wish]
    transactions: [Transaction]
    jsonld: String
    
    searchWish(name:String!):[Wish]
    wishesIssuing(issuingId:Int!):[Wish]
    transactionsDonor(donorId:Int!):[Transaction]
    transactionsIssuing(issuingId:Int!):[Transaction]
    searchIssuing(email: String!, passwd: String!):Issuing!
    getIssuingId(email: String!):Issuing!
    searchDonor(email: String!, passwd: String!):Donor!
    getDonorId(email: String!):Donor!
  }
  type Mutation {
    addWish(name:String!, description:String!, price:Float!, issuingId:Int!):Wish!
    addIssuing(name:String!, surname:String!, email:String!, passwd:String!):Issuing!
    addDonor(name:String!, surname:String!, email:String!, passwd:String!):Donor!
    addTransaction(wishId:Int!, issuingId:Int!, donorId:Int!, cant:Float!):Transaction!
    editWish(wishId:Int!, cant:Float!):Wish!
  }
  type Issuing{
	name: String
	email: String
	_id: ID
	wishes: [Wish]
  }
  
  type Donor{
    name: String
    email: String
    _id: ID
    wishes: [Wish]
  }

  type Wish{
	name: String
	description: String
	price: Float
	issuing: Issuing
	_id: ID
  }

  type Transaction{
	issuing: Issuing
	donor: Donor
	wish: Wish
	cant: Float
  }
`)


const rootValue = {
    hello: () => "Hello World!",
    issuings: () => DB.objects('Issuing'),
    donors: () => DB.objects('Donor'),
    wishes: () => DB.objects('Wish'),
    transactions: () => DB.objects('Transaction'),
    jsonld:() => JSON.stringify(jsonLD),
    searchWish: ({ name }) => {
        return DB.objects('Wish').filter(x => x.name.toLowerCase().includes(name.toLowerCase()))
    },
    wishesIssuing: ({ issuingId }) => {
        return DB.objects('Wish').filter(x => x.issuing.id === issuingId)
    },
    transactionsDonor: ({ donorId }) => {
        return DB.objects('Transaction').filter(x => x.donor.id === donorId)
    },
    transactionsIssuing: ({ issuingId }) => {
        return DB.objects('Transaction').filter(x => x.issuing.id === issuingId)
    },
    getIssuingId: ({ id }) => {
        return DB.objects('Issuing').find(x => x.id === id)
    },
    searchIssuing: ({ email, passwd }) => {
        return DB.objects('Issuing').find(x => x.email === email && x.passwd === passwd)
    },
    getDonorId: ({ id }) => {
        return DB.objects('Donor').find(x => x.id === id)
    },
    searchDonor: ({ email, passwd }) => {
        return DB.objects('Donor').find(x => x.email === email && x.passwd === passwd)
    },
    addWish: ({ name, description, price, issuingId}) => {
        let wishesList = DB.objects('Wish')
        let idAct = wishesList[wishesList.length-1].id
        let issuing = DB.objectForPrimaryKey('Issuing', issuingId)
        let data = null
        data = {
            _id: ObjectId(),
            _partition: model.patitionKey,
            timestamp: new Date(),
            name: name,
            description: description,
            price: price,
            issuing: issuing,
        }
        DB.write(() => {DB.create('Wish', data) })
        let wish = { name: data.name, description: data.description, price: data.price, issuing: data.issuing.name }
        sse.emitter.emit('new-wish', wish)
        return data
    },
    addIssuing: ({ name, surname, email, passwd }) => {
        let issuingsList = DB.objects('Issuing')
        let idAct = issuingsList[issuingsList.length-1].id
        let currEmail = issuingsList.find(x => x.email === email)
        let data = null
        if (!currEmail){
            data = {
                _id: ObjectId(),
                _partition: model.patitionKey,
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: Array[null],
            }
            DB.write(() => {DB.create('Issuing', data) })
            let issuing = { id: data.id, name: data.name, username: data.username, email: data.email, passwd: data.passwd }
            sse.emitter.emit('new-issuing', issuing)
        }
        return data
    },
    addDonor: ({ name, surname, email, passwd }) => {
        let donorsList = DB.objects('Donor')
        let idAct = donorsList[donorsList.length-1].id
        let currEmail = donorsList.find(x => x.email === email)
        let data = null
        if (!currEmail){
            data = {
                _id: ObjectId(),
                _partition: model.patitionKey,
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: Array[null],
            }
            DB.write(() => {DB.create('Donor', data) })
            let donor = { name: data.name, username: data.username, email: data.email, passwd: data.passwd }
            sse.emitter.emit('new-donor', donor)
        }
        return data
    },
    addTransaction: ({ wishId, issuingId, donorId, cant }) => {
        let data = null
        let donorsList = DB.objects('Donor')
        let donor = donorsList.find(x => x.id === donorId)
        let issuingsList = DB.objects('Issuing')
        let issuing = issuingsList.find(x => x.id === issuingId)
        let wishesList = DB.objects('Wish')
        let wish = wishesList.find(x => x.id === wishId)
        let transactionsList = DB.objects('Transaction')
        let idAct = transactionsList[transactionsList.length-1].id
        if (idAct === undefined) {
            idAct = 0
        }
        if (wish.price >= cant) {
            data = {
                _id: ObjectId(),
                _partition: model.patitionKey,
                timestamp: new Date(),
                issuing: issuing,
                donor: donor,
                wish: wish,
                cant: cant,
            }
            DB.write(() => {DB.create('Transaction', data)})
            DB.write(() => {donor.wishes.push(wish)})
            DB.write(() => {wish.price -= cant})
            /*for (let index in issuing.wishes){
                let id = issuing.wishes[index].id
                if (id === wish.id) {
                    DB.write(() => {issuing.wishes.splice(issuing.wishes[index], 1)})
                }
            }
            DB.write(() => {issuing.wishes.push(wish)})
            DB.write(() => {donor.wishes.push(wish)})*/
            let transaction = {wish: data.wish.name, cant: data.cant, donor: data.donor.name, issuing: data.issuing.id}
            sse.emitter.emit('new-transaction', transaction)
        }
        return data
    },
}

exports.root = rootValue
exports.schema = schema
exports.sse = sse
