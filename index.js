const express = require("express");
const mongoose = require("mongoose");

const passport = require("passport");
require("./config/passport-setup")(passport); // Configura passport

const cors = require("cors");

const TreeSpecies = require("./models/TreeSpecies");
const Video = require("./models/Video");
const PointOfInterest = require("./models/PointOfInterest");
const Garden = require("./models/Garden");

const authRoutes = require("./routes/authRoutes");

const isAdmin = require("./middleware/isAdmin");

// Configuração básica do express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:3000/api", // Permite acesso da origem especificada
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/esas_tree_species_db");

app.use(passport.initialize());

app.use("/api/auth", authRoutes); // Usa as rotas de autenticação

// API endpoints

//Autenticação
app.get(
  "/api/auth/user",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json(req.user);
  }
);

//Endpoint Gardens
app.get("/api/gardens", async (req, res) => {
  try {
    const gardens = await Garden.find();
    res.json(gardens);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar Jardins.", error: error });
  }
});

// Rota GET para detalhes do jardim
app.get("/api/gardens/:gardenId", async (req, res) => {
  const { gardenId } = req.params;

  try {
    // Busca o jardim pelo ID e preenche com as árvores associadas
    // Certifique-se de que o nome do campo que contém as referências das árvores é 'trees'
    const garden = await Garden.findById(gardenId).populate("trees");

    if (!garden) {
      // Se não encontrar o jardim, retorna um erro 404 com JSON
      return res.status(404).json({ message: "Jardim não encontrado" });
    }

    // Envia os dados do jardim como resposta JSON
    res.json(garden);
  } catch (error) {
    // Registra o erro e envia uma resposta de erro 500 com JSON
    console.error("Erro ao buscar detalhes do jardim:", error);
    res.status(500).json({ message: "Erro ao processar a solicitação" });
  }
});
// Rota Post
app.post("/api/gardens", async (req, res) => {
  const { name, longitude, latitude } = req.body;
  try {
    const newGarden = new Garden({
      name,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });
    const savedGarden = await newGarden.save();
    res.status(201).json(savedGarden);
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar jardim.", error: error });
  }
});
// Rota delete
app.delete("/api/gardens/:gardenId", async (req, res) => {
  try {
    await Garden.findByIdAndDelete(req.params.gardenId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro ao excluír jardim.", error: error });
  }
});

// Endpoint Vista Panorâmica atualizado para seguir a convenção dos outros endpoint
app.get("/api/gardens/:id/panoramic-garden", async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) {
      return res.status(404).json({ message: "Jardim não encontrado" });
    }
    const panoramicImageUrl = garden.panoramicImage;
    res.json({ panoramicImageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erro ao buscar a vista panorâmica do jardim.",
      error: error,
    });
  }
});

// Endpoint Species
app.get("/api/species", async (req, res) => {
  try {
    const species = await TreeSpecies.find();
    res.json({
      species: species,
      current: 1, // Apenas 1 página se não for paginado
      pages: 1, // Apenas 1 página se não for paginado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar espécies." });
  }
});
// Rota Post
app.post("/api/species", async (req, res) => {
  try {
    const newSpecies = new TreeSpecies(req.body);
    const savedSpecies = await newSpecies.save();
    res.status(201).json(savedSpecies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao adicionar a espécie" });
  }
});

// Foi substituído res.render por res.json para visualizar detalhes
app.get("/api/species/:id", async (req, res) => {
  try {
    const speciesId = req.params.id;
    const species = await TreeSpecies.findById(speciesId);
    if (!species) {
      return res.status(404).json({ message: "Espécie não encontrada" });
    }
    res.json(species);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao procurar a espécie" });
  }
});

// PATCH para atualizar espécie
app.patch("/api/species/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSpecies = await TreeSpecies.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedSpecies) {
      return res.status(404).json({ message: "Espécie não encontrada." });
    }
    res.json(updatedSpecies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar a espécie." });
  }
});

// DELETE para remover espécie
app.delete("/api/species/:id", isAdmin, async (req, res) => {
  try {
    const deleteResult = await TreeSpecies.findByIdAndDelete(req.params.id);
    if (!deleteResult) {
      return res.status(404).json({ message: "Espécie não encontrada." });
    }
    res.status(204).send(); // No content to send back
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao excluir a espécie: " + error.message });
  }
});

// Video Endpoints
// Listar todos os videos
app.get("/api/videos", async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar videos." });
  }
});
// Adicionar um novo video
app.post("/api/videos", isAdmin, async (req, res) => {
  try {
    const newVideo = new Video(req.body);
    await newVideo.save();
    res.status(201).json(newVideo);
  } catch (error) {
    res.status(500).json({ message: "Erro ao adicionar video." });
  }
});
// Atualizar um video
app.put("/api/videos/:id", isAdmin, async (req, res) => {
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedVideo);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar video." });
  }
});
// Excluír um video
app.delete("/api/videos/:id", isAdmin, async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Video removido com sucesso." });
  } catch (error) {
    res.status(500).json({ message: "Erro ao remover video." });
  }
});

// Endpoint para Pontos de Interesse
// Listar
app.get("/api/points-of-interest", async (req, res) => {
  try {
    const points = await PointOfInterest.find();
    res.json(points);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar Pontos de Interesse." });
  }
});
// Obter Detalhes
app.get("/api/points-of-interest/:id", async (req, res) => {
  try {
    const point = await PointOfInterest.findById(req.params.id);
    if (!point) {
      res.status(404).json({ message: "Ponto de interesse não encontrado." });
    } else {
      res.json(point);
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao buscar detalhes do Ponto de Interesse." });
  }
});
// Criar um novo Ponto de Interesse
app.post("/api/points-of-interest", async (req, res) => {
  try {
    const newPoint = new PointOfInterest(req.body);
    const savedPoint = await newPoint.save();
    res.status(201).json(savedPoint);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao criar um novo Ponto de Interesse." });
  }
});
// Atualizar
app.put("/api/points-of-interest/:id", async (req, res) => {
  try {
    const updatedPoint = await PointOfInterest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedPoint);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erro ao atualizar um Ponto de Interesse." });
  }
});
// Excluír
app.delete("/api/points-of-interest/:id", async (req, res) => {
  try {
    await PointOfInterest.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao remover um Ponto de Interesse." });
  }
});

// Rotas para outras entidades seriam semelhantes:
// GET, POST, PUT, DELETE endpoints devem ser criados para cada modelo conforme necessário

app.listen(PORT, () => {
  console.log(`Servidor em execução na porta ${PORT}`);
});
