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
    wishesIssuing(issuingId:ID!):[Wish]
    wishesDonor(donorId:ID!):[Wish]
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
  }
  
  type Donor{
    name: String
    email: String
  }

  type Wish{
	name: String
	description: String
	price: Float
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
    users: () => DB.objects('User'),
    blogs: () => DB.objects('Blog'),
    searchBlog: ({ q }) => {
        q = q.toLowerCase()
        return DB.objects('Blog').filter(x => x.title.toLowerCase().includes(q))
    },
    posts: ({ blogId }) => {
        return DB.objects('Post').filter(x => x.blog.title == blogId)
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
                id: BSON.ObjectID(),
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
        let data = null
        //if (!currEmail){
            data = {
                id:BSON.ObjectID(),
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: [Wish], // [Wish] pero wish no definido
            }
            DB.write(() => {DB.create('Issuing', data) })
        //}
        return data
    },
    addDonor: ({ name, surname, email, passwd }) => {
        //let currEmail = issuings.find(x=>x.email === email)
        let data = null
        //if (!currEmail){
            data = {
                id:BSON.ObjectID(),
                name: name,
                surname: surname,
                email: email,
                passwd: passwd,
                wishes: Array[null], // [Wish] pero wish no definido
            }
            DB.write(() => {DB.create('Donor', data) })
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
