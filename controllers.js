const { graphql, buildSchema } = require('graphql')

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
    }
}

exports.root = rootValue
exports.schema = schema
exports.sse = sse
