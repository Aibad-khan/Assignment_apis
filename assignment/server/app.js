const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config({path:'./server/.env'});

const app = express();
app.use(bodyParser.json());

// MySQL Connection
    // const db = mysql.createConnection({
    // host: process.env.HOST,
    // user: process.env.USER,
    // password: process.env.PASSWORD,
    // database: process.env.DATABASE
    // });

    // db.connect((err) => {
    // if (err) throw err;
    // console.log('Connected to MySQL Database.');
    // });
    // const dbUrl = process.env.URL;

    // // Create a connection pool using the URL
    // const db = mysql.createConnection(dbUrl);
    
    // // Test the connection
    // db.getConnection((err, connection) => {
    //     if (err) {
    //         console.error('Error connecting to MySQL database:', err);
    //         throw err;
    //     }
    //     console.log('Connected to MySQL Database.');
    //     // When done with the connection, release it back to the pool
    //     connection.release();
    // });
    
    const db = mysql.createPool({
      host: process.env.HOST,
      user: process.env.USER,
      password: process.env.PASSWORD,
      database: process.env.DB,
      waitForConnections: true,  // Wait for available connections if the pool is full
      connectionLimit: 5,       // Maximum number of connections in the pool
      queueLimit: 0              // Unlimited queue length for connection requests
    });
    
    // Get a connection from the pool
    db.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to MySQL database:', err);
        throw err;
      }
    
      console.log('Connected to MySQL Database.');
    
      // When done with the connection, release it back to the pool
      connection.release();
    });
    

// Add School Endpoint
app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validate input data
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
  db.query(query, [name, address, latitude, longitude], (err, result) => {
    if (err) throw err;
    res.status(201).json({ message: 'School added successfully.', schoolId: result.insertId });
  });
});

// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const R = 6371; // Radius of the Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Distance in km
};

// List Schools Endpoint
app.get('/listSchools', (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Latitude and longitude are required.' });
  }

  const query = 'SELECT * FROM schools';
  db.query(query, (err, results) => {
    if (err) throw err;

    // Calculate distance for each school
    const schoolsWithDistance = results.map(school => {
      const distance = calculateDistance(latitude, longitude, school.latitude, school.longitude);
      return { 
        "name":school.name,
        "distance(Km)":distance
       };
    });

    // Sort schools by distance
    schoolsWithDistance.sort((a, b) => a["distance(Km)"]- b["distance(Km)"]);
  
    res.status(200).json(schoolsWithDistance);
  });
});

// Start the Server

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
