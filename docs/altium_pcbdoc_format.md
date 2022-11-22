# Altium PcbDoc Format (WORK IN PROGRESS)

The Altium PcbDoc format is an OLE Compound Document. It contains a directory structure with a variety of ASCII/UTF8 and binary structured data streams.

## Document Format Versions

At the time of writing, Altium uses PcbDoc Version 6.0.

The root directory contains a pair of header files: `FileHeader` and `FileHeaderSix`. The latter is used to indicate that this is a V6 file format (as opposed to a V5 or prior).

There are directories for each data type. Some of these directories are suffixed with `6` to indicate that the data within uses the V6 format. This is generally how the data versioning works:

- If a directory is only present without a `6` suffix, the format is identical for V5 and V6 documents.
- If a directory is only present with a `6` suffix, it is a new data structure for V6 documents.
- If directories both with and without a `6` suffix are present, the suffixed directory contains the actual data and the old directory contains compatibility data for older versions.

As an example of the last case, V6 documents will include both `Texts` and `Texts6` directories, but the data stream in the `Texts` directory replaces all of the text with a warning:

> This is a version 6.0 file and cannot be read correctly into this version of the software.
>
> Close this file immediately withotu saving.
>
> Saving this file will result in loss of data.

TL;DR - if both `6` and non-`6` directories are present, ignore the non-`6` version.

## Record Formats

Many of the data files represent each element as a record format, with each record starting with a byte to indicate its type (record ID) and a 4-byte integer to indicate the length of the record.

### Arc (Record ID 1)

...

### Pad (Record ID 2)

...

### Via (Record ID 3)

Via records represent vias, unsurprisingly. These records are specifically for vias; through-hole pads are separately represented using pad records (ID 2).

Via records are stored in `/Vias6/Data`.

| Offset (Decimal) | Type   | Name         | Info                                                         |
| ---------------- | ------ | ------------ | ------------------------------------------------------------ |
| 0                | byte   | LayerID      | Layer index. Always points to the Multi-Layer layer, because vias span multiple layers. |
| 1                | byte   | Unknown1     | Unknown. Seems to always be 12. |
| 2                | byte   | Unknown2     | Unknown. Usually 0. |
| 3                | uint16 | NetID        | Net index. 0xFFFF means no net.                              |
| 5                | byte   | Unknown5     | Unknown. Usually 0xFF. |
| 6                | byte   | Unknown6     | Unknown. Usually 0xFF. |
| 7                | uint16 | ComponentID | Component index. 0xFFFF means no component. |
| 9                | byte   | Unknown9     | Unknown. Usually 0xFF. |
| 10               | byte   | Unknown10    | Unknown. Usually 0xFF. |
| 11               | byte   | Unknown11    | Unknown. Usually 0xFF. |
| 12               | byte   | Unknown12    | Unknown. Usually 0xFF. |
| 13               | uint32 | PosX         | X position in 1/10000th mils                                 |
| 17               | uint32 | PosY         | Y position in 1/10000th mils                                 |
| 21               | uint32 | ViaDiameter  | Via diameter in 1/10000th mils                               |
| 25               | uint32 | HoleDiameter | Hole diameter position in 1/10000th mils                     |
| 29               | byte   | LayerFromID  | Starting layer ID. Maps to LAYERxNAME in board properties.   |
| 30               | byte   | LayerToID    | Ending layer ID. Maps to LAYERxNAME in board properties.     |
| 31   | byte | Flags | Bitwise flags. 2 indicates that this via is part of component. |
| 32   | byte | Unknown32 | Unknown. Value varies but is typically constant in file. |
| 33   | byte | Unknown33 | Unknown. Value varies but is typically constant in file. |
| 34   | byte | Unknown34 | Unknown. Usually 1. |
| 35   | byte | Unknown35 | Unknown. Usually 0. |
| 36   | byte | Unknown36 | Unknown. Usually 4. |
| 37   | byte | Unknown37 | Unknown. Usually 0. |
| 38   | byte | Unknown38 | Unknown. Value varies but is typically constant in file. |
| 39   | byte | Unknown39 | Unknown. Value varies but is typically constant in file. |
| 40   | byte | Unknown40 | Unknown. Usually 0. |
| 41   | byte | Unknown41 | Unknown. Usually 0. |
| 42   | byte | Unknown42 | Unknown. Value varies but is typically constant in file. |
| 43   | byte | Unknown43 | Unknown. Value varies but is typically constant in file. |
| 44   | byte | Unknown0                | Unknown. Usually 1.                                          |
| 45   | byte | Unknown45 | Unknown. Usually 0. |
| 46   | byte | Unknown46 | Unknown. Value varies but is typically the same as offset 42. |
| 47   | byte | Unknown47 | Unknown. Value varies but is typically the same as offset 43. |
| 48   | byte | Unknown48 | Unknown. Usually 1. |
| 49   | byte | Unknown49 | Unknown. Usually 0. |
| 50   | byte | Unknown50 | Unknown. Usually 0. |
| 51   | byte | Unknown51 | Unknown. Usually 0. |
| 52   | byte | Unknown52 | Unknown. Usually 0. |
| 53   | byte | Unknown53 | Unknown. Usually 0. |
| 54   | byte | Unknown54 | Unknown. Value varies. |
| 55   | byte | Unknown55 | Unknown. Value varies. |
| 56   | byte | SolderMaskExpansionType | 0 = manual, 255 = rule |
| 57   | byte | Unknown57 | Unknown. Seems to match offset 56. |
| 58   | byte | Unknown58 | Unknown. Value varies. |
| 59   | byte | Unknown59 | Unknown. Usually 0. |
| 60   | byte | Unknown60 | Unknown. Usually 0. |
| 61   | byte | Unknown61 | Unknown. Usually 1. |
| 62   | byte | Unknown62 | Unknown. Usually 1. |
| 63   | byte | Unknown63 | Unknown. Usually 1. |
| 64   | byte | Unknown64 | Unknown. Usually 1. |

### Track (Record ID 4)

Tracks are stored in `/Tracks6/Data`.

Track records represent straight lines on any layer. This includes mechanical, silkscreen, etc. as well as conductive traces.

Track records are typically 49 bytes in size.

| Offset (Decimal) | Type    | Name                     | Info                                                         |
| ---------------- | ------- | ------------------------ | ------------------------------------------------------------ |
| 0                | byte    | LayerID                  | Matches LAYERnNAME board record in board data                |
| 1                | byte    | Flags                    | Bitwise flags. 1=Selected, 4=Unlocked, 16=PartOfComponent    |
| 2                | byte    | Keepout                  | Name taken from altium2kicad. Not exactly sure what this does. |
| 3                | uint16  | NetID                    | Net index. 0xFFFF means no net.                              |
| 5                | uint16  | PolygonID                | Polygon index. 0xFFFF means not part of polygon.             |
| 7                | uint16  | ComponentID              | Component index. 0xFFFF means not part of a component. Value is valid when Flags indicates that this is part of a component. |
| 9                | uint32  | Unknown9                 | Unknown. Only seen 0xFFFFFFFF.                               |
| 13               | uint32  | StartX                   | Starting X position in 1/10000th mils                        |
| 17               | uint32  | StartY                   | Starting Y position in 1/10000th mils                        |
| 21               | uint32  | EndX                     | Ending X position in 1/10000th mils                          |
| 25               | uint32  | EndY                     | Ending Y position in 1/10000th mils                          |
| 29               | uint32  | Width                    | Width in 1/10000th mils                                      |
| 33               | byte    | Unknown33                | Unknown. Only seen 0x00.                                     |
| 34               | byte    | Unknown34                | Unknown. Only seen 0x00.                                     |
| 35               | byte    | Unknown35                | Unknown. Only seen 0x00.                                     |
| 36               | byte    | UnionID                  | Union index.                                                 |
| 37               | bool(1) | PartOfLengthTuningObject | True if this track is part of a length tuning object.        |
| 38               | byte    | Unknown38                | Unknown. Only seen 0x00.                                     |
| 39               | byte    | Unknown39                | Unknown. Only seen 0x00.                                     |
| 40               | byte    | Unknown40                | Unknown. Only seen 0x00.                                     |
| 41               | uint16  | Unknown41                | Unknown. Various values, 0xFFFF common on bottom layer tracks. |
| 43               | byte    | Unknown43                | Unknown. Only seen 0x00.                                     |
| 44               | bool(1) | UserRouted               | True if this is a user routed track, false if it was autorouted. |
| 45               | byte    | Unknown45                | Unknown. Only seen 0x00.                                     |
| 46               | byte    | Unknown46                | Unknown. Only seen 0x00.                                     |
| 47               | byte    | Unknown47                | Unknown. Only seen 0x00.                                     |
| 48               | byte    | Unknown48                | Unknown. Only seen 0x00.                                     |

### Text (Record ID 5)

...

### Fill (Record ID 6)

...

### Connection (Record ID 7)

...

### Net (Record ID 8)

...

### Component (Record ID 9)

...

### Polygon (Record ID 10)

...

### Region (Record ID 11)

...

### Component Body (Record ID 12)

...

### Dimension (Record ID 13)

...

### Coordinate (Record ID 14)

...

### Class (Record ID 15)

...

### Rule (Record ID 16)

...

### From-To (Record ID 17)

...

### Differential Pair (Record ID 18)

...

### Violation (Record ID 19)

...

### Embedded (Record ID 20)

...

### Embedded Board (Record ID 21)

...

### Split Plane (Record ID 22)

...

### Trace (Record ID 23)

...

### Spare Via (Record ID 24)

...

### Board (Record ID 25)

...

### Board Outline (Record ID 26)

...

## Property List Formats

Property lists are a common format in Altium documents. Each property in a property list is in the format `NAME=VALUE`, with properties separated with a pipe character (`|`).

Property lists are almost always prefixed with a 32-bit length field. UTF-8 encoding is used. The property list is terminated with a single null byte, which is included in the length of the property list.

Property lists may start with a pipe character (i.e. not a name/value pair) or a single string identifier with no equals sign.

Property lists may be separated into segments with newlines, with each segment starting with a pipe character or identifier string as if it were its own property list.

Property lists often include duplicate names with different values. It is unclear why this is, but in every case I've seen so far you can just take the latest value.

### Board

The board property list is stored in `/Board6/Data`.

This is a fairly complicated property list, containing all sorts of information about the document, board, layers, layer groups, stackup, planes, materials, via styles, routing settings, 2D and 3D display options, etc.

Many of the properties are versioned, with some sort of version identifier in the property names. As of Altium 22.5 the latest properties (that I know of) are V9.

#### Custom Stackup Data

The `V9_STACKCUSTOMDATA` property contains a Base64-encoded zlib deflated XML document. The decompressed document is prefixed with a `?` character.

The XML serialisation code is in `Altium.LayerStackManager.dll`, which is a .NET binary. There are several variants of XML stackup documents, each with its own implementation in the `Altium.LayerStackManager.Serialization` namespace:

- XML Stackup Document v1.0 (*.lsx) in `StackupDocumentXmlSerializer_V1_0`
- XML Stackup Document v1.1 (*.stackupx) in `StackupDocumentXmlSerializer_V1_1`
- Extended XML Stackup Document (*.stackupext) in `StackupDocumentXmlExtendedSerializer_V1_0`

The formats are defined in the `Altium.LayerStackManager.Abstractions.StackupDocumentFormats` class, within `Altium.LayerStackManager.Abstractions.dll`

If you open the Layer Stack Manager and go to File -> Save As, you can choose "Xml Stackup Document (*.stackupx)" as a format. This saves an XML Stackup Document v1.1, which (as of Altium 22.5) is exactly equal to the XML document in this string.

The description below is for this v1.1 format.

Each element within this document has an `Id` attribute containing a GUID. The GUIDs are not case-sensitive, and are in the standard format `00000000-0000-0000-0000-000000000000`.

##### StackupDocument

The root element is `StackupDocument`. It has a `SerializerVersion` attribute, which should be set to `1.1.0.0` to indicate a V1.1 document. For v1.0 documents, this will be `1.0.0.0`.

The "Extended" format also uses `1.1.0.0` as a version, but as of Altium 22.5 there is no deserialiser for this format so you shouldn't run into it.

The `RevisionId` attribute contains a GUID that matches the 

##### FeatureSet & Feature

The `FeatureSet` element contains `Feature` elements. This is used to indicate when extra features have been enabled on a stackup.

Each `Feature` element has feature name as its text contents, but this may be a localised string. Features should instead by identified by their GUID, which is in the `Id` attribute.

Known features are:

- Standard Stackup (GUID: c8939e8a-fd0e-4d52-8860-b7a98f452016)
- Impedance Calculator (GUID: E3DF2B86-5F1B-49CA-B266-D1AE57F0BA6F)
- Rigid-Flex (GUID: 5277E6A4-9E5F-4F54-951F-DC18CFEB7530)
- Printed Electronics (GUID: 68E477FE-0406-4BD2-AD1D-6DD49217052C)
- Back Drills, aka "Drill Span" (GUID: 0A82BA33-E4D8-43F3-9C01-412DC26BDD5E)
- Generic Stackup (GUID: 231FB828-14F8-43F8-9DDF-B2A90A4C5283) - unclear what this is for; possibly related to server-hosted stackup templates.

##### TypeExtensions

The `TypeExtensions` element is usually empty. I can only guess that this is used to store stackup properties for extensions.

##### Stackup

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

##### Stacks

The `Stacks` element sits inside the `Stackup` element. It has no attributes and is just a container for `Stack` elements.

##### Stack

The `Stack` element describes a layer stackup.

There's usually only one `Stack` element in here; it's unclear if there is any situation where multiple stacks might be present. The XML format likely supports multiple stackups for stack template libraries, but in the embedded PcbDoc stackup data it's unlikely that there would be multiple stackups. It's possible that rigid-flex or other advanced PCB stackups might include multiple stacks.

Its known attributes are:

- `Name` - The name of the layer stack (usually "Board Layer Stack")
- `IsSymmetric` - True or False. Set by the Stack Symmetry checkbox.
- `IsFlex` - True or False. Indicates whether this is a rigid-flex stackup.
- `IsManaged` - True or False. Indicates whether this stackup came from a managed library.
- `LibraryCompliance` - True or False. Not sure what this is for.
- `TemplateId` - GUID for a stackup template. Likely points to the inbuilt Altium layer stack template that was used as a starting point for this stackup.

##### Layers

The `Layers` element sits inside a `Stack` element. It has no attributes and is just a container for `Layer` elements.

##### Layer

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

##### Layer Properties

The `Properties` element within each `Layer` element is a container for `Property` elements.

##### Layer Property

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



