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
  }
  type Mutation {
    addWish(name:String!, description:String!, price:Float!):Wish!
    addIssuing(name:String!, surname:String!, email:String!, passwd:String!):Issuing!
    addDonor(name:String!, surname:String!, email:String!, passwd:String!):Donor!
    addTransaction(wishId:ID!, issuingId:ID!, donorId:ID!):Transaction!
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
  }

  type Transaction{
	issuing: Issuing
	donor: Donor
	wish: Wish
  }
`)


const rootValue = {
    hello: () => "Hello World!",
    issuings: () => DB.objects('Issuing'),
    donors: () => DB.objects('Donor'),
    wishes: () => DB.objects('Wish'),
    transactions: () => DB.objects('Transaction'),
    searchWish: ({ name }) => {
        return DB.objects('Wish').filter(x => x.name === name)
    },
    wishesIssuing: ({ issuingId }) => {
        return DB.objects('Wish').filter(x => x.issuing.id === issuingId)
    },
    transactionsDonor: ({ donorId }) => {
        return DB.objects('Transaction').filter(x => x.donor.id === donorId)
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
    addWish: ({ name, description, price}) => {
        let currId = DB.objectForPrimaryKey('currentUserID') // id user actual
        let currIssuer = issuings.find(x => x.id === currId).foo

        if (currIssuer){
            let data = {
                id: 12,
                timestamp: Date.now(),
                name: name,
                description: description,
                price: price,
                issuing: currIssuer,
            }

            DB.write(() => {DB.create('Wish', data) })

            let wish = { name: data.name, description: data.description, price: data.price }
            sse.emitter.emit('new-wish', wish)
        }
        return data
    },
    addIssuing: ({ name, surname, email, passwd }) => {
        //let currEmail = issuings.find(x=>x.email === email) //encontrar email si existe
        let issuingsList = DB.objects('Issuing')
        let idAct = issuingsList[issuingsList.length-1].id
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
            DB.write(() => {DB.create('Issuing', data) })
            let issuing = { id: data.id, name: data.name, username: data.username, email: data.email, passwd: data.passwd }
            sse.emitter.emit('new-issuing', issuing)
        //}
        return data
    },
    addDonor: ({ name, surname, email, passwd }) => {
        //let currEmail = issuings.find(x=>x.email === email)
        let data = null
        //if (!currEmail){
            data = {
                id:127,
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
    addTransaction: ({ wishId, issuingId, donorId }) => {   // no se puede probar
        let currWish = wishes.find( x=> x.id === wishId).foo
        let transactionByWishId = transactions.find(x=>x.wish === currWish)
        let data = null

        if (transactionByWishId == undefined){
            data = {
                id:3,
                timestamp: Date.now(),
                issuing: issuings.find(x => x.id === issuingId).foo,
                donor: donors.find(x => x.id === donorId).foo,
                wish: currWish,
            }
            DB.write(() => {DB.create('Transaction', data) })
        }
        return data
    },
    userWishes: ({ userId }) => {
        let user = issuings.find(x=>x.id === userId).foo
        if(user == undefined){
            user = donors.find(x=x.id === userId).foo
        }
        return user.wishes
    }
}

exports.root = rootValue
exports.schema = schema
exports.sse = sse
