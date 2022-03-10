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
    wishes(userId:ID!):[Wish]
  }
  type Mutation {
    addWish(name:String!, description:String!, price:double!):Wish!
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
	desccription: String
	price: Double
  }

  type Transaction{
	issuing: Issuing
	donor: Donor
	wish: Wish
  }
`)


const rootValue = {
    hello: () => "Hello World!",
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
    }
}

exports.root = rootValue
exports.schema = schema
exports.sse = sse
