import { Link } from 'react-router-dom'

export default function SewerNetwork() {
  return (
    <>
      <p className="lead">
        A treatment plant gets the photographs. The network does most of the work. The plant at
        Nishat can only treat what reaches it, and for the Dal Lake sewerage scheme that means 210 km
        of new sewer, 3,728 manholes, 15,814 house chambers and ten pumping stations, all built before
        the plant has anything to treat.
      </p>
      <p>Here is the route a household's wastewater will take, from the house to the plant.</p>

      <h2>1. The house chamber</h2>
      <p>
        It starts at the property line. The scheme builds 15,814 masonry connection and property
        chambers, each joining a building's drain to the public sewer. They are the least visible part
        of the project and among the most important: a building that is not connected still sends its
        wastewater towards the lake, however good the plant is.
      </p>

      <h2>2. The sewer</h2>
      <p>
        From the chamber, wastewater enters the sewer: 210 km of it, in RCC, ductile iron and HDPE
        pipe of all diameters. Each material has its usual place in Indian sewerage practice:
      </p>
      <ul>
        <li><b>RCC NP3</b> is a heavy-duty class of non-pressure reinforced concrete pipe, used for gravity
          sewers under roads and fill.</li>
        <li><b>Ductile iron</b> is normally used where the pipe runs under pressure, such as the
          rising mains that leave a pumping station.</li>
        <li><b>HDPE</b> is light and flexible, with welded joints that keep groundwater out and
          sewage in.</li>
      </ul>
      <p>
        A gravity sewer has to fall all the way. Around a lake the ground is flat, so the longer a
        sewer runs the deeper it has to be laid.
      </p>

      <h2>3. The manhole</h2>
      <p>
        Along the way, 3,728 RCC manholes, from 910 to 1,520 mm in diameter, give access for
        inspection and cleaning. Manholes go where a sewer changes direction, gradient or size, where
        branches join, and at intervals along straight runs, so that no length of pipe is out of
        reach of the maintenance crews.
      </p>

      <h2>4. The pumping station</h2>
      <p>
        When a sewer has gone as deep as it sensibly can, a pumping station lifts the flow so that it
        can start again near the surface, or pushes it through a rising main to where gravity can
        take over. The scheme has ten: nine intermediate stations and the main pumping station at
        Habak.
      </p>

      <h2>5. The plant</h2>
      <p>
        At Nishat the flow passes the inlet works, where screens take out rags and plastics and vortex
        chambers spin out grit, before it reaches the four sequencing batch reactor basins. Each basin
        fills, aerates, settles and decants in turn. The treated water passes a chlorine contact tank
        and discharges to the wetland west of the plant. The process is drawn out
        on <Link to="/site/technology">How It Works</Link>.
      </p>

      <h2>Why the order matters</h2>
      <p>
        The network and the civil works are being built through 2026 and 2027, the machinery is
        installed in late 2027, and the plant is commissioned in 2028. That order follows the water:
        a plant cannot be tested without flow, and the flow arrives only through the network. After
        commissioning comes a six-month trial run against design performance, then five years of
        operation and maintenance. You can follow the stages on the <Link to="/site/timeline">project
        timeline</Link>.
      </p>
    </>
  )
}
