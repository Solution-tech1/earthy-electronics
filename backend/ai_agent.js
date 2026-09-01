const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');

module.exports = (dbGet, dbAll, dbRun, JWT_SECRET) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1 || '');

  const tools = [
    {
      functionDeclarations: [
        {
          name: "updateStock",
          description: "Update the stock quantity for a specific product.",
          parameters: {
            type: "OBJECT",
            properties: {
              productId: { type: "INTEGER", description: "ID of the product" },
              newStock: { type: "INTEGER", description: "New stock amount" }
            },
            required: ["productId", "newStock"]
          }
        },
        {
          name: "searchProduct",
          description: "Search for a product by name to get its ID and current stock.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Search query e.g. 'Haier AC'" }
            },
            required: ["query"]
          }
        },
        {
          name: "getAnalytics",
          description: "Get overall site analytics: revenue, views, orders, avg session time.",
          parameters: {
            type: "OBJECT",
            properties: {},
          }
        }
      ]
    }
  ];

  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    tools,
    systemInstruction: "You are the smart AI Assistant for the EarthyElectronics Admin Panel. Your role is strictly to help the admin manage the store efficiently. You can search products, update stock quantities, and fetch site analytics like total revenue, site views, and session times. Always respond professionally, concisely, and you may use Roman Urdu or English depending on how the admin speaks to you. Always verify details using tools before answering. If asked to do something outside your scope (like writing code or answering general knowledge questions), politely decline and remind the admin of your purpose."
  });
  
  const authAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  router.post('/chat', authAdmin, async (req, res) => {
    const { prompt, history } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    try {
      const formattedHistory = (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      
      const chat = model.startChat({ history: formattedHistory });
      
      let finalReply = '';
      let result = await chat.sendMessage([{ text: prompt }]);
      let response = result.response;
      let calls = response.functionCalls();

      // Handle potentially multiple sequential function calls
      while (calls && calls.length > 0) {
        const call = calls[0];
        const args = call.args;
        let functionResponse = {};

        if (call.name === 'searchProduct') {
          const rows = await dbAll("SELECT id, name, stock FROM products WHERE name LIKE ? LIMIT 5", [`%${args.query}%`]);
          functionResponse = { products: rows.length > 0 ? rows : "No products found." };
        } 
        else if (call.name === 'updateStock') {
          await dbRun('UPDATE products SET stock=? WHERE id=?', [args.newStock, args.productId]);
          const updated = await dbGet('SELECT name, stock FROM products WHERE id=?', [args.productId]);
          functionResponse = { status: 'success', product: updated };
        }
        else if (call.name === 'getAnalytics') {
          const views = await dbGet('SELECT COUNT(*) as v FROM site_views');
          const orders = await dbGet('SELECT COUNT(*) as o FROM orders');
          const sessions = await dbGet('SELECT AVG(duration_seconds) as s FROM user_sessions');
          functionResponse = { totalViews: views.v, totalOrders: orders.o, avgSessionSeconds: sessions.s };
        }

        // Send function response back
        result = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: functionResponse
          }
        }]);
        
        response = result.response;
        calls = response.functionCalls();
      }

      finalReply = response.text();
      res.json({ reply: finalReply });
    } catch (error) {
      console.error('Chatbot error:', error);
      res.status(500).json({ error: 'AI processing failed' });
    }
  });

  return router;
};
