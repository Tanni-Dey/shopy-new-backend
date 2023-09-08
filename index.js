import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//database url
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1tyqf.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//database connect function
const run = async () => {
  try {
    // await client.connect();
    const db = client.db("shopy");

    // all collection
    const productCollection = db.collection("products");
    const cartCollection = db.collection("carts");

    //------------------all api start-----------------

    //get all product api
    app.get("/products", async (req, res) => {
      const findProducts = productCollection.find({});
      const allProducts = await findProducts.toArray();
      res.send(allProducts);
    });

    //post product api
    app.post("/add-product", async (req, res) => {
      const newProduct = req.body;
      const product = await productCollection.insertOne(newProduct);
      res.send(product);
    });

    //get single product api
    app.get("/product/:id", async (req, res) => {
      const productId = req.params.id;
      const product = await productCollection.findOne({
        _id: new ObjectId(productId),
      });
      res.send(product);
    });

    // --------cart api---------

    //get all cart product by user api
    app.get("/user-cart", async (req, res) => {
      const userEmail = req.query.email;
      const userCart = await cartCollection.findOne({ user: userEmail });
      res.send(userCart);
    });

    //add product by user api
    app.patch("/add-product-to-cart", async (req, res) => {
      const userEmail = req.query.email;
      const newCart = {
        user: req.body.user,
        cartProducts: req.body.product,
        total: req.body.product[0].price,
      };

      const userCart = await cartCollection.findOne({ user: userEmail });
      if (userCart) {
        const userCartByProduct = await cartCollection.findOne({
          user: userEmail,
          cartProducts: {
            $elemMatch: { _id: req.body.product[0]._id },
          },
        });

        if (!userCartByProduct) {
          userCart.cartProducts.push(req.body.product[0]);

          const totalPrice = userCart.cartProducts.reduce(
            (accumulator, currentProduct) => {
              return accumulator + Number(currentProduct.price);
            },
            0
          );

          const newProductByExistingUser = await cartCollection.updateOne(
            { user: userEmail },
            { $set: { cartProducts: userCart.cartProducts, total: totalPrice } }
          );
          res.send(newProductByExistingUser);
        }
      } else {
        const newUser = await cartCollection.insertOne(newCart);
        res.send(newUser);
      }
    });

    //update cart product quantity
    app.put("/update-cart-product", async (req, res) => {
      const userEmail = req.query.email;
      const updateCart = await cartCollection.updateOne(
        { user: userEmail, "cartProducts._id": req.body.product._id },
        {
          $set: {
            "cartProducts.$.cartQuantity": req.body.product.cartQuantity,
            "cartProducts.$.productTotal": req.body.product.productTotal,
            total: req.body.total,
          },
        }
      );

      res.send(updateCart);
    });

    //delete cart product
    app.put("/delete-cart-product", async (req, res) => {
      const userEmail = req.query.email;
      const productId = req.body.id;
      const updateCart = await cartCollection.updateOne(
        { user: userEmail, "cartProducts._id": productId },
        {
          $pull: {
            cartProducts: { _id: productId },
          },
          $set: {
            total: req.body.total,
          },
        }
      );

      res.send(updateCart);
    });

    //cart delete api
    app.delete("/cart-delete", async (req, res) => {
      const userEmail = req.query.email;
      const deletedCart = await cartCollection.deleteOne({
        user: userEmail,
      });
      res.send(deletedCart);
    });

    //user wishlist
    app.put("/add-to-wishlist", async (req, res) => {
      const id = req.query.id;
      const userEmail = req.query.email;
      const addToWishlist = await productCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { wishList: userEmail } }
      );
      res.send(addToWishlist);
    });

    //get user wishlist
    app.get("/user-wishlist", async (req, res) => {
      const userEmail = req.query.email;
      const findProducts = productCollection.find({ wishList: userEmail });
      const allWishlistProducts = await findProducts.toArray();
      res.send(allWishlistProducts);
    });

    //-------manage product api-------

    //product approved api
    app.put("/product-approved", async (req, res) => {
      const productId = req.query.id;
      const approvedProduct = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: { approved: true } }
      );
      res.send(approvedProduct);
    });

    //product edit api
    app.put("/product-edit/:id", async (req, res) => {
      const productId = req.params.id;
      const updatedProduct = await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $set: req.body }
      );
      res.send(updatedProduct);
    });

    //product delete api
    app.delete("/product-delete", async (req, res) => {
      const productId = req.query.id;
      const deletedProduct = await productCollection.deleteOne({
        _id: new ObjectId(productId),
      });
      res.send(deletedProduct);
    });

    //---------------------all api end--------------------
  } finally {
  }
};
run().catch((err) => console.log(err));

app.get("/", async (req, res) => {
  res.send("shopy");
});
app.listen(port, () => console.log("shopy backend connected"));
