//Database.js
const mongoose= require('mongoose');

const connectDB= async (req,res)=>{
try{
const connection= await mongoose.connect(process.env.MONGODB_URI);

console.log(`Host : ${connection.connection.host}`);
console.log(`Database : ${connection.connection.name}`);

return connection;

console.log('Database connected : ',connection);
}catch(error){
console.error('Error connecting database : ',error);
}
}

module.exports= {connectDB};