# Altium XML Stackup Document Format

This document describes the Altium XML Stackup Document file format, found in `*.stackupx` files and embedded in the `V9_STACKCUSTOMDATA` property of the `Board6` stream found in Altium's `*.PcbDoc` PCB documents.

## Versioning

The XML serialisation code is in `Altium.LayerStackManager.dll`, which is a .NET binary. There are several variants of XML stackup documents, each with its own implementation in the `Altium.LayerStackManager.Serialization` namespace:

- XML Stackup Document v1.0 (*.lsx) in `StackupDocumentXmlSerializer_V1_0`
- XML Stackup Document v1.1 (*.stackupx) in `StackupDocumentXmlSerializer_V1_1`
- Extended XML Stackup Document (*.stackupext) in `StackupDocumentXmlExtendedSerializer_V1_0`

The formats are defined in the `Altium.LayerStackManager.Abstractions.StackupDocumentFormats` class, within `Altium.LayerStackManager.Abstractions.dll`

If you open the Layer Stack Manager and go to File -> Save As, you can choose "Xml Stackup Document (*.stackupx)" as a format. As of Altium 22.5, this saves an XML Stackup Document v1.1.

The description below is for this v1.1 format.

## Elements

Each main element within this XML document has an `Id` attribute containing a GUID. The GUIDs are not case-sensitive, and are in the standard format `00000000-0000-0000-0000-000000000000`.

### StackupDocument

The root element is `StackupDocument`. It has a `SerializerVersion` attribute, which should be set to `1.1.0.0` to indicate a V1.1 document. For v1.0 documents, this will be `1.0.0.0`.

The "Extended" format also uses `1.1.0.0` as a version, but as of Altium 22.5 there is no deserialiser for this format so you shouldn't run into it.

The `RevisionId` attribute contains a GUID that matches the 

### FeatureSet & Feature

The `FeatureSet` element contains `Feature` elements. This is used to indicate when extra features have been enabled on a stackup.

Each `Feature` element has feature name as its text contents, but this may be a localised string. Features should instead by identified by their GUID, which is in the `Id` attribute.

Known features are:

- Standard Stackup (GUID: c8939e8a-fd0e-4d52-8860-b7a98f452016)
- Impedance Calculator (GUID: E3DF2B86-5F1B-49CA-B266-D1AE57F0BA6F)
- Rigid-Flex (GUID: 5277E6A4-9E5F-4F54-951F-DC18CFEB7530)
- Printed Electronics (GUID: 68E477FE-0406-4BD2-AD1D-6DD49217052C)
- Back Drills, aka "Drill Span" (GUID: 0A82BA33-E4D8-43F3-9C01-412DC26BDD5E)
- Generic Stackup (GUID: 231FB828-14F8-43F8-9DDF-B2A90A4C5283) - unclear what this is for; possibly related to server-hosted stackup templates.

### TypeExtensions

The `TypeExtensions` element is usually empty. I can only guess that this is used to store stackup properties for extensions.

### Stackup

The `Stackup` element describes the global properties of the stackup. Its known attributes are:

- `Type` (Standard or Printed)
- `RoughnessType` - The roughness model (Model Type) for the stackup
  - `NoRoughness` - Flat Conductors
  - `MHammerstad` - Modified Hammerstad
  - `HuraySnowball` - Huray Snowball
  - `MGroiss` - Modified Groiss
  - `Hemispherical` - Hemispherical
  - `HurayBracken` - Huray-Bracken
- `RoughnessFactorSR` - The surface roughness (usually a value suffixed with "um")
- `RoughnessFactor` - The roughness factor in percent (usually a bare number)
- `RealisticRatio` - True or False. Unclear what this is for.

### Stacks

The `Stacks` element sits inside the `Stackup` element. It has no attributes and is just a container for `Stack` elements.

### Stack

The `Stack` element describes a layer stackup.

There's usually only one `Stack` element in here; it's unclear if there is any situation where multiple stacks might be present. The XML format likely supports multiple stackups for stack template libraries, but in the embedded PcbDoc stackup data it's unlikely that there would be multiple stackups. It's possible that rigid-flex or other advanced PCB stackups might include multiple stacks.

Its known attributes are:

- `Name` - The name of the layer stack (usually "Board Layer Stack")
- `IsSymmetric` - True or False. Set by the Stack Symmetry checkbox.
- `IsFlex` - True or False. Indicates whether this is a rigid-flex stackup.
- `IsManaged` - True or False. Indicates whether this stackup came from a managed library.
- `LibraryCompliance` - True or False. Not sure what this is for.
- `TemplateId` - GUID for a stackup template. Likely points to the inbuilt Altium layer stack template that was used as a starting point for this stackup.

### Layers

The `Layers` element sits inside a `Stack` element. It has no attributes and is just a container for `Layer` elements.

### Layer

The `Layer` element describes a layer in a stackup.

Its known attributes are:

- `Name` - The name of the layer.
- `IsEnabled` - True or False. Defaults to True, so this attribute is usually omitted unless it's False.
- `IsShared` - True or False. Not sure what this is for, but it's True in every layer I've seen.
- `TypeId` - GUID for the type of layer. Known values:
  - Foil: `31E48829-E750-4C28-95E0-1A8313F0158E`
  - Plane: `F59FAB94-C5ED-467D-94CD-F60A323C5D5B`
  - Signal: `F4ECCD87-2CFB-4F37-BE50-4F3A272B4D01`
  - Surface Finish: `B0827674-798C-4CF8-807C-8E6C2A11C145`
  - Isolation: `92B02D5E-8D69-48A8-880E-AC4B77DB099D`
  - Core: `136C62EF-1FA6-4897-AE71-7E797B632B92`
  - Prepreg: `1A79611A-039D-4D40-A204-53C26C50F8B5`
  - Plating: `90B89AA0-A48A-45F4-82F5-B3ECA4EC8CCE`
  - Adhesive: `448F9952-79BA-41D8-A8F4-4713EE7A3828`
  - Stiffener: `9FD889FA-C97A-401C-A066-E5F746678381`
  - Misc: `786B5F28-F093-4084-BBA7-46E8F4F24F55`
  - Marking: `886956F5-B2E9-4114-93F3-F69AF872BFFB`

There are other "base layer" type IDs, but it's unclear if these are used:

- Abstract: `5EE2359D-AD77-4DAD-BD77-5A2334695235`
- Unknown: `4AF561F4-6919-43D8-942A-D3579B371C26`
- Physical: `DAA9ECCC-0064-462D-854E-0B9E829EF563`
- Dielectric: `56EB1CA5-014A-4387-A43E-1485F44F081E`
- Overlay: `C7EF040E-8D00-490B-B00C-A7E7823FF174`
- Solder Mask: `7B384237-13D8-4318-8BCB-ACCD8D9A51E7`
- Bikini Coverlay: `8DE65238-89ED-47C5-BBF8-0F6F02D1899C`
- Paste Mask: `E6A36257-B90F-45E5-9F8D-A213ECDB687C`
- Mechanical: `7A47E6B3-B591-41F7-A27B-8C6B0477E458`

These might not be used for stackup layers, but instead for other layer descriptors.

### Layer Properties

The `Properties` element within each `Layer` element is a container for `Property` elements.

#### Layer Property

Each `Property` element in a layer describes a property of that layer. Each has a `Name` attribute and a `Type` attribute. The property value is in the text contents of the element. The `Type` attribute is either a .NET type name or a member of the `System.TypeCode` enum. This will probably change in the near future, because deserialising unrestricted types is a major security risk.

Known properties include:

- `Thickness` - Thickness of the layer, typically with a unit suffix (e.g. "1.4mil")
- `Weight` - Copper weight of the layer, e.g. "0.5oz" or "2oz". Typically used on foil layers.
- `Process` - String. Used to describe the formation process of the layer material. Used on foil and surface finish layers.
  - Typical foil processes are:
    - "ED" for electrodeposited
    - "RA" for rolled-annealed
  - Typical surface finish processes are:
    - "HASL" for PbSn HASL
    - "HASL Lead-Free" for lead-free HASL
    - "ENIG" for electroplated nickel-gold
    - "IAu" for immersion gold
    - "OSP" for ENTEK organic solderability preservative
    - "ISn" for immersion tin
- `Material` - Name of the material.
- `PullbackDistance` - The distance (in mils) of pullback on plane layers.
- `CopperOrientation` - May be "Above" or "Below". Matches the "Copper Orientation" field in the stackup layer properties. Describes which direction the copper is etched from.
- `Orientation` - May be "None" (not allowed), "Top", or "Bottom". Matches the "Orientation" field in the stackup layer properties. This is used in rigid-flex boards and boards with embedded components. This specifies the side of the layer that components can be placed on during manufacturing, before the next layer is adhered.
- `Note` - The note field in the layer properties.
- `Comment` - The comment field in the layer properties.
- `DielectricConstant` - Number describing the dielectric constant of the material.
- `LossTangent` - Number describing the loss tangent of the material.
- `Material.Manufacturer` - String. Manufacturer of the material.
- `Material.Description` - String. Description of the material, e.g. "Copper Foil" or "FR-4"
- `Material.GlassTransitionTemp` - Glass transition temperature of the material, with either "C" or "F" as a suffix to specify Celsius or Fahrenheit.
- `GlassTransTemp` - Same as above, but seems to be used when this is overridden from the material value.
- `DielectricStrength` - The dielectric strength of the material in kV/mm.
- `VolumeResistivity` - The volume resistivity of the material in Ohm-meters.
- `Resin` - Resin percentage. Used in dielectric layers.
- `Solid` - Solid percentage. Used in dielectric layers.
- `Material.Frequency` - Frequency that the material is rated for.
- `Frequency` - Same as above, but likely an override.
- `Constructions` - String. Used to describe the prepreg construction/weave (e.g. 106, 1080, 2113, 3313, 7628, etc.)
- `CoverlayExpansion` - Coverlay expansion in mils.



