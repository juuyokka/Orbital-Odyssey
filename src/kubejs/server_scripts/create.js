// const of heat levels
const HeatRequirement = {
  none: "none",
  heated: "heated",
  superheated: "superheated",
};

// const of recipes
const recipes = {
  compacting: [
    {
      name: "steel",
      heatRequirement: HeatRequirement.heated,
      ingredients: [
        { type: "item", id: "minecraft:coal" },
        { type: "item", id: "minecraft:iron_ingot" },
      ],
      results: [{ type: "item", id: "stellaris:steel_ingot" }],
    },
  ],
  mixing: [
    {
      name: "oil",
      heatRequirement: HeatRequirement.none,
      ingredients: [
        { type: "fluid", id: "createdieselgenerators:crude_oil", amount: 250 },
      ],
      results: [{ type: "fluid", id: "stellaris:oil", amount: 250 }],
    },
    {
      name: "insulating resin",
      heatRequirement: HeatRequirement.none,
      ingredients: [
        { type: "fluid", id: "minecraft:water", amount: 500 },
        { type: "item", id: "minecraft:bone_meal" },
        { type: "item", id: "minecraft:glowstone_dust" },
        { type: "item", id: "minecraft:slime_ball" },
        { type: "tag", id: "c:silicon" },
      ],
      results: [{ type: "item", id: "appflux:insulating_resin" }],
    },
  ],
};

// mixing function, takes in attributes from a recipe
function mixing(event, name, heat, ingredients, results) {
  let ing = []; // lists of json objects
  let res = []; // to pass to event.custom

  for (let ingredient of ingredients) {
    // check if type is undefined
    if (ingredient.type == undefined) {
      console.error(`Error parsing ingredients of ${name}: type is undefined!`);
    } else if (ingredient.type == "") {
      console.error(`Error parsing ingredients of ${name}: type is blank!`);
    }

    // check if id is undefined
    if (ingredient.id == undefined) {
      console.error(`Error parsing ingredients of ${name}: id is undefined!`);
    } else if (ingredient.id == "") {
      console.error(`Error parsing ingredients of ${name}: id is blank!`);
    }

    // parse ingredient and push json objects
    let type = ingredient.type;
    if (type == "item") {
      ing.push({ item: ingredient.id });
    } else if (type == "fluid") {
      ing.push({
        type: "fluid_stack",
        amount: ingredient.amount,
        fluid: ingredient.id,
      });
    } else if (type == "tag") {
      ing.push({ tag: ingredient.id });
    }
  }

  for (let result of results) {
    // check if type is undefined
    if (result.type == undefined) {
      console.warn(
        `Warning parsing results of ${name}: type is undefined! It is recommended to define a type for readabillity.`,
      );
    } else if (result.type == "") {
      console.warn(
        `Warning parsing results of ${name}: type is blank! It is recommended to define a type for readabillity.`,
      );
    }

    // check if id is undefined
    if (result.id == undefined) {
      console.error(`Error parsing results of ${name}: id is undefined!`);
    } else if (result.id == "") {
      console.error(`Error parsing results of ${name}: id is blank!`);
    }

    // parse result and push json objects
    if (result.amount != undefined) {
      res.push({ amount: result.amount, id: result.id });
    } else {
      res.push({ id: result.id });
    }
  }

  // create recipe from parsed and re-compiled objects
  event.custom({
    type: "create:mixing",
    heat_requirement: heat,
    ingredients: ing,
    results: res,
  });
}

// compacting function, takes in attributes from a recipie
function compacting(event, name, heat, ingredients, results) {
  let ing = []; // lists of json objects
  let res = []; // to pass to event.custom

  for (let ingredient of ingredients) {
    // check if type is undefined
    if (ingredient.type == undefined) {
      console.error(`Error parsing ingredients of ${name}: type is undefined!`);
    } else if (ingredient.type == "") {
      console.error(`Error parsing ingredients of ${name}: type is blank!`);
    }

    // check if id is undefined
    if (ingredient.id == undefined) {
      console.error(`Error parsing ingredients of ${name}: id is undefined!`);
    } else if (ingredient.id == "") {
      console.error(`Error parsing ingredients of ${name}: id is blank!`);
    }

    // parse ingredient and push json objects
    let type = ingredient.type;
    if (type == "item") {
      ing.push({ item: ingredient.id });
    } else if (type == "fluid") {
      ing.push({
        type: "fluid_stack",
        amount: ingredient.amount,
        fluid: ingredient.id,
      });
    } else if (type == "tag") {
      ing.push({ tag: ingredient.id });
    }
  }

  for (let result of results) {
    // check if type is undefined
    if (result.type == undefined) {
      console.warn(
        `Warning parsing results of ${name}: type is undefined! It is recommended to define a type for readabillity.`,
      );
    } else if (result.type == "") {
      console.warn(
        `Warning parsing results of ${name}: type is blank! It is recommended to define a type for readabillity.`,
      );
    }

    // check if id is undefined
    if (result.id == undefined) {
      console.error(`Error parsing results of ${name}: id is undefined!`);
    } else if (result.id == "") {
      console.error(`Error parsing results of ${name}: id is blank!`);
    }

    // parse result and push json objects
    if (result.amount != undefined) {
      res.push({ amount: result.amount, id: result.id });
    } else {
      res.push({ id: result.id });
    }
  }

  // create recipe from parsed and re-compiled objects
  // "what the hell dude, we could have just used datapacks!"
  // - Xyno
  event.custom({
    type: "create:compacting",
    heat_requirement: heat,
    ingredients: ing,
    results: res,
  });
}

// const of recipe categories
const categories = {
  compacting: compacting,
  mixing: mixing,
};

ServerEvents.recipes((event) => {
  // remove original mixing recipe for insulating resin by renaming the original shapeless recipe
  event.remove({ id: "appflux:insulating_resin" });
  event
    .shapeless("appflux:insulating_resin", [
      "minecraft:water_bucket",
      "minecraft:cactus",
      "minecraft:cactus",
      "minecraft:bone_meal",
      "#c:silicon",
      "minecraft:slime_ball",
      "#c:dusts/glowstone",
    ])
    .id("appflux:insulating_resin_manual_only");
  // loop through recipes and load them
  for (let recipeCategory in recipes) {
    for (let recipe of recipes[recipeCategory]) {
      console.log(`Loading ${recipeCategory} recipe: ${recipe.name}`);
      if (recipeCategory in categories) {
        categories[recipeCategory](
          event,
          recipe.name,
          recipe.heatRequirement,
          recipe.ingredients,
          recipe.results,
        );
      } else {
        console.error(
          `Error while loading recipe categories: ${recipeCategory} is not a valid recipe!`,
        );
      }
    }
  }
});
