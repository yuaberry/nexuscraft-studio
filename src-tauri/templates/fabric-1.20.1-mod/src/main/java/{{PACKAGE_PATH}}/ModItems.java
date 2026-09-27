package {{PACKAGE}};

import net.fabricmc.fabric.api.itemgroup.v1.FabricItemGroup;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroup;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

/**
 * Item registrations for {{MOD_NAME}}.
 * New items are added by the Nexus Agent here (and in the matching
 * model + lang files under assets).
 */
public class ModItems {
    private static Item register(String name, Item item) {
        Identifier id = new Identifier({{MOD_ID_CLASS}}.MOD_ID, name);
        return Registry.register(Registries.ITEM, id, item);
    }

    /** Example item — a placeholder the first build compiles against. */
    public static final Item EXAMPLE_ITEM = register("example_item",
            new Item(new Item.Settings()));

    /** Creative tab for this mod. */
    public static final ItemGroup EXAMPLE_GROUP = FabricItemGroup.builder()
            .icon(() -> new ItemStack(EXAMPLE_ITEM))
            .displayName(Text.translatable("itemgroup.{{MOD_ID}}.example"))
            .entries((context, entries) -> entries.add(EXAMPLE_ITEM))
            .build();

    public static void initialize() {
        Registry.register(Registries.ITEM_GROUP,
                new Identifier({{MOD_ID_CLASS}}.MOD_ID, "example"), EXAMPLE_GROUP);
    }
}
