const klass = global.klass;

if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function (callbackFn, thisArg) {
    return this.reduce(function (acc, val) {
      const mappedVal = callbackFn.call(thisArg, val);
      return acc.concat(mappedVal);
    }, []);
  };
}

const CreateIngredient = klass({
  initialize: function (args) {
    this.args = args;
  },
  serialize: function () {
    throw new Error("Ingredient must implement a serialize function");
  },
});

const CreateOutput = klass({
  initialize: function (args) {
    this.args = args;
  },
  serialize: function () {
    let res = {};
    if (this.args.chance != null) res.chance = this.args.chance;
    return res;
  },
});

const CreateItemStackIngredient = CreateIngredient.extend()
  .statics({ id: "item" })
  .methods({
    serialize: function () {
      let res = { item: this.args.item };
      if (this.args.count != null) res.count = this.args.count;
      return res;
    },
  });

const CreateItemTagIngredient = CreateIngredient.extend()
  .statics({ id: "item_tag" })
  .methods({
    serialize: function () {
      let res = { tag: this.args.tag };
      if (this.args.count != null) res.count = this.args.count;
      return res;
    },
  });

const CreateFluidStackIngredient = CreateIngredient.extend()
  .statics({ id: "fluid" })
  .methods({
    serialize: function () {
      return {
        fluid: this.args.fluid,
        type: "fluid_stack",
        amount: this.args.amount,
      };
    },
  });

const CreateFluidTagIngredient = CreateIngredient.extend()
  .statics({ id: "fluid_tag" })
  .methods({
    serialize: function () {
      return {
        fluid_tag: this.args.fluid_tag,
        type: "fluid_tag",
        amount: this.args.amount,
      };
    },
  });

const CreateItemStackOutput = CreateOutput.extend()
  .statics({ id: "item" })
  .methods({
    serialize: function () {
      let res = { id: this.args.item };
      if (this.args.count != null) res.count = this.args.count;
      return Object.assign(res, this.supr());
    },
  });

const CreateFluidStackOutput = CreateOutput.extend()
  .statics({ id: "fluid" })
  .methods({
    serialize: function () {
      let res = { id: this.args.fluid, amount: this.args.amount };
      return Object.assign(res, this.supr(this));
    },
  });

const CreateIngredientMap = new Map(
  [
    CreateItemStackIngredient,
    CreateItemTagIngredient,
    CreateFluidStackIngredient,
    CreateFluidTagIngredient,
  ].map((i) => [i.id, i]),
);

const CreateOutputMap = new Map(
  [CreateItemStackOutput, CreateFluidStackOutput].map((i) => [i.id, i]),
);

const CreateIngredientOutputMap = new Map(
  [
    [CreateItemStackIngredient, CreateItemStackOutput],
    [CreateFluidStackIngredient, CreateFluidStackOutput],
  ].flatMap(([ingredient, output]) => [
    [ingredient, output],
    [output, ingredient],
  ]),
);

function makeCreateIngredient(args) {
  const types = {
    item: CreateIngredientMap.get("item"),
    tag: CreateIngredientMap.get("item_tag"),
    fluid: CreateIngredientMap.get("fluid"),
    fluid_tag: CreateIngredientMap.get("fluid_tag"),
  };

  const key = Object.keys(types).find((k) => k in args);

  return types[key];
}

function makeCreateOutput(args) {
  const types = {
    item: CreateOutputMap.get("item"),
    fluid: CreateOutputMap.get("fluid"),
  };

  const key = Object.keys(types).find((k) => k in args);

  return types[key];
}

function mergeWithArrays(target, source) {
  return Object.entries(source).reduce((acc, [key, value]) => {
    let res = {};
    res[key] = Array.isArray(value) && Array.isArray(acc[key]) ? acc[key].concat(value) : value;
    return Object.assign(acc, res);
  }, target);
}

const RecipeType = klass({
  initialize: function (id, recipeArguments) {
    this.id = id;
    this.recipeArguments = new Map(recipeArguments.map((a) => [a.id, a]));
  },
  build: function (args) {
    const serializedArguments = Object.entries(args).map(([argKey, argValue]) => {
      const ArgClass = this.recipeArguments.get(argKey);
      let fallback = {};
      fallback[argKey] = argValue;
      return ArgClass == null ? fallback : new ArgClass(argValue).serialize();
    });

    return serializedArguments.reduce(mergeWithArrays, { type: this.id });
  },
});

const RecipeArgument = klass({
  initialize: function (args) {
    this.data = args;
  },
  serialize: function () {
    const ctor = this.constructor;
    let res = {};
    res[ctor.id] = this.data;

    return res;
  },
});

const CreateIngredientArgument = RecipeArgument.extend()
  .statics({ id: "ingredients" })
  .methods({
    serialize: function () {
      const chanceOutputs = this.data.flatMap((i) => {
        if (i.return_chance == null || i.return_chance === 0) return [];
        const createIngredient = makeCreateIngredient(i);
        const createOutput = CreateIngredientOutputMap.get(createIngredient);

        return createOutput != null
          ? new createOutput(Object.assign(i, { chance: i.return_chance })).serialize()
          : [];
      });

      let res = {
        ingredients: this.data.map((i) => {
          const createIngredient = makeCreateIngredient(i);
          return new createIngredient(i).serialize();
        }),
      };

      if (chanceOutputs.length > 0) res.results = chanceOutputs;

      return res;
    },
  });

const CreateOutputArgument = RecipeArgument.extend()
  .statics({ id: "results" })
  .methods({
    serialize: function () {
      return {
        results: this.data.map((i) => {
          const createOutput = makeCreateOutput(i);
          return new createOutput(i).serialize();
        }),
      };
    },
  });

// average online discourse
const CreateHeatedArgument = RecipeArgument.extend().statics({
  id: "heat_requirement",
  none: "none",
  heated: "heated",
  superheated: "superheated",
});

const CreateProcessingTimeArgument = RecipeArgument.extend().statics({
  id: "processing_time"
});

const CreateMixingRecipe = new RecipeType("create:mixing", [
  CreateHeatedArgument,
  CreateIngredientArgument,
  CreateOutputArgument,
]);

const CreateCompactingRecipe = new RecipeType("create:compacting", [
  CreateHeatedArgument,
  CreateIngredientArgument,
  CreateOutputArgument,
]);

const CreateRecipeTypeMap = new Map(
  [CreateMixingRecipe, CreateCompactingRecipe].map((i) => [i.id, i]),
);

ServerEvents.recipes((event) => {
  // Remove Applied Flux insulating resin recipe and rename it so Create doesn't generate the mixing recipe
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

  const recipes = {
    "create:mixing": {
      insulating_resin: {
        ingredients: [
          { fluid: "minecraft:water", amount: 500 },
          { item: "minecraft:bone_meal" },
          { item: "minecraft:glowstone_dust" },
          { item: "minecraft:slime_ball" },
          { tag: "c:silicon" },
        ],
        results: [{ item: "appflux:insulating_resin" }],
      },
      oil: {
        ingredients: [{ fluid: "createdieselgenerators:crude_oil", amount: 250 }],
        results: [{ fluid: "stellaris:oil", amount: 250 }],
      },
    },
    "create:compacting": {
      steel: {
        heat_requirement: CreateHeatedArgument.heated,
        ingredients: [{ item: "minecraft:coal" }, { item: "minecraft:iron_ingot" }],
        results: [{ item: "stellaris:steel_ingot" }],
      },
    },
  };

  Object.entries(recipes).forEach(([recipeTypeId, recipes]) => {
    const recipeType = CreateRecipeTypeMap.get(recipeTypeId);
    Object.values(recipes).forEach((recipe) => event.custom(recipeType.build(recipe)));
  });
});
