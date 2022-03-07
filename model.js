const Realm = require('realm')

let UserSchema = {
    name: 'User',
    primaryKey: 'name',
    properties: {
        name: 'string',
        passwd: 'string'
    }
}

let PostSchema = {
    name: 'Post',
    primaryKey: 'title',
    properties: {
        timestamp: 'date',
        title: 'string',
        content: 'string',
        author: 'User',
        blog: 'Blog'
    }
}

let BlogSchema = {
    name: 'Blog',
    primaryKey: 'title',
    properties: {
        title: 'string',
        creator: 'User' //esto es una referencia a un usuario
    }
}

/*let IssuingSchema = {
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
}*/

// // // MODULE EXPORTS

let config = { path: './data/blogs.realm', schema: [PostSchema, UserSchema, BlogSchema] }

exports.getDB = async() => await Realm.open(config)

// // // // // 

if (process.argv[1] == __filename) { //TESTING PART

    if (process.argv.includes("--create")) { //crear la BD

        Realm.deleteFile({ path: './data/blogs.realm' }) //borramos base de datos si existe

        let DB = new Realm({
            path: './data/blogs.realm',
            schema: [PostSchema, UserSchema, BlogSchema]
        })

        DB.write(() => {
            let user = DB.create('User', { name: 'user0', passwd: 'xxx' })

            let blog = DB.create('Blog', { title: 'Todo Motos', creator: user })

            let post = DB.create('Post', {
                title: 'prueba moto',
                blog: blog,
                content: 'esto es una prueba de motos',
                creator: user,
                timestamp: new Date()
            })

            console.log('Inserted objects', user, blog, post)
        })
        DB.close()

    } else { //consultar la BD

        Realm.open({ path: './data/blogs.realm', schema: [PostSchema, UserSchema, BlogSchema] }).then(DB => {
            let users = DB.objects('User')
            users.forEach(x => console.log(x.name))
            let blog = DB.objectForPrimaryKey('Blog', 'Todo Motos')
            if (blog)
                console.log(blog.title, 'by', blog.creator.name)
            DB.close()
        })
    }

}