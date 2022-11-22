# Altium PcbDoc Format (WORK IN PROGRESS)

The Altium PcbDoc format is an OLE Compound Document. It contains a directory structure with a variety of ASCII/UTF8 and binary structured data streams.

## Contents

[TOC]

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

This is the same format as a `*.stackupx` document, which can be saved from the Layer Stack Manager window using File -> Save As.

A full description of this XML format can be found [here](altium_xml_stackup_document_format.md).

