const { graphql, buildSchema } = require('graphql')
const BSON = require('bson')

const model = require('./model') //Database

let DB
model.getDB().then(db => { DB = db })


const sse = require('./utils/notifications') //Notifications
sse.start()


const schema = buildSchema(`
  type Query {
    hello: String
    issuings: [Issuing]
    donors: [Donor]
    wishes: [Wish]
    transactions: [Transaction]
    
    searchWish(name:String!):[Wish]
    wishesIssuing(issuingId:Int!):[Wish]
    transactionsDonor(donorId:Int!):[Transaction]
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
	id: Int
  }
  
  type Donor{
    name: String
    email: String
    id: Int
  }

  type Wish{
	name: String
	description: String
	price: Float
	issuing: Issuing
	id: Int
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
    searchWish: ({ name }) => {
        return DB.objects('Wish').filter(x => x.name.toLowerCase().includes(name.toLowerCase()))
    },
    wishesIssuing: ({ issuingId }) => {
        return DB.objects('Wish').filter(x => x.issuing.id === issuingId)
    },
    transactionsDonor: ({ donorId }) => {
        return DB.objects('Transaction').filter(x => x.donor.id === donorId)
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
    addPost: ({ title, content, authorId, blogId }) => {

        let blog = DB.objectForPrimaryKey('Blog', blogId)
        let auth = DB.objectForPrimaryKey('User', authorId)
        let data = null

        if (blog && auth) {
            data = {
                title: title,
                content: content,
                author: auth,
                blog: blog,
                timestamp: new Date()
            }

            DB.write(() => { DB.create('Post', data) })

            // SSE notification (same view as in graphQL)
            let post = { title: data.title, content: data.content, author: { name: data.author.name }, blog: { title: blog.title } }
            sse.emitter.emit('new-post', post)
        }

        return data
    },
    addUser: ({ name }) => {
        let user = DB.objectForPrimaryKey('User', name)
        let data = null
        if (!user) {
            data = {
                name: name,
                passwd: name,
            }
            DB.write(() => { DB.create('User', data) })

            let user = { name: data.name, passwd: data.passwd }
            sse.emitter.emit('new-user', user)
        }
        return data
    },
    addWish: ({ name, description, price, issuingId}) => {
        /*let currId = DB.objectForPrimaryKey('Issuing', id) // id user actual
        let issuingsList = DB.objects('Issuing')
        let currIssuer = issuingsList.find(x => x.id === currId).foo*/
        let wishesList = DB.objects('Wish')
        let idAct = wishesList[wishesList.length-1].id
        let issuing = DB.objectForPrimaryKey('Issuing', issuingId)
        let data = null
        data = {
            id: idAct+1,
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
        //let currEmail = issuings.find(x=>x.email === email) //encontrar email si existe
        let issuingsList = DB.objects('Issuing')
        let idAct = issuingsList[issuingsList.length-1].id
        let currEmail = issuingsList.find(x => x.email === email)
        let data = null
        if (!currEmail){
            data = {
                id:idAct+1,
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: Array[null], // [Wish] pero wish no definido
            }
            DB.write(() => {DB.create('Issuing', data) })
            let issuing = { id: data.id, name: data.name, username: data.username, email: data.email, passwd: data.passwd }
            sse.emitter.emit('new-issuing', issuing)
        }
        return data
    },
    addDonor: ({ name, surname, email, passwd }) => {
        //let currEmail = issuings.find(x=>x.email === email)
        let donorsList = DB.objects('Donor')
        let idAct = donorsList[donorsList.length-1].id
        let data = null
        //if (!currEmail){
            data = {
                id:idAct+1,
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: Array[null], // [Wish] pero wish no definido
            }
            DB.write(() => {DB.create('Donor', data) })
        let donor = { name: data.name, username: data.username, email: data.email, passwd: data.passwd }
        sse.emitter.emit('new-donor', donor)
        //}
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
        data = {
            id: idAct+1,
            timestamp: new Date(),
            issuing: issuing,
            donor: donor,
            wish: wish,
            cant: cant,
        }
        DB.write(() => {DB.create('Transaction', data) })
        let transaction = { wish: data.wish, cant: data.cant, donor: data.donor }
        sse.emitter.emit('new-transaction', transaction)
        return data
    },
    /*userWishes: ({ userId }) => {
        let user = issuings.find(x=>x.id === userId).foo
        if(user == undefined){
            user = donors.find(x=x.id === userId).foo
        }
        return user.wishes
    }*/
}

exports.root = rootValue
exports.schema = schema
exports.sse = sse
