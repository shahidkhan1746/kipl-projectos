import { Link } from 'react-router-dom'
import { TravelPartnerLink } from '../../TravelPartnerLink'

export default function IndustrialVisits() {
  return (
    <>
      <p className="lead">
        A sewage treatment plant under construction is one of the better classrooms a civil or
        environmental engineering department can find. Everything that will later be buried or
        closed is still in the open: reinforcement before the concrete goes in, sewer pipe before
        the trench is backfilled, a manhole before its cover is set.
      </p>
      <p>
        The Dal Lake sewerage scheme is building a 38.5 MLD sequencing batch reactor plant at
        Nishat, Srinagar, and 210 km of sewer network to feed it, between November 2025 and May
        2028. Its phases line up with a good part of an engineering syllabus. This note is for
        faculty planning a visit: what a group can see at each stage, how to ask, and how to get a
        class to Srinagar.
      </p>

      <h2>What there is to see, phase by phase</h2>
      <p>What a group sees depends on when it comes. The programme runs in four broad stages.</p>
      <div className="kb-table">
      <table>
        <thead>
          <tr><th scope="col">When</th><th scope="col">On site</th><th scope="col">Best for</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="kb-when">2026–2027</td>
            <td>Sewer laying in RCC, ductile iron and HDPE pipe; RCC manholes from 910 to 1,520 mm
              diameter; house connection chambers; civil works at the pumping stations and the plant,
              where four basins, each 65.5 m by 29 m and 6 m deep, are being built.</td>
            <td>Civil engineering: reinforced concrete, water-retaining structures, open-cut sewer
              laying, site quality control.</td>
          </tr>
          <tr>
            <td className="kb-when">Late 2027</td>
            <td>Pumps, blowers, fine-bubble diffusers, decanters, SCADA and online monitoring being
              installed and tested.</td>
            <td>Mechanical, electrical and instrumentation.</td>
          </tr>
          <tr>
            <td className="kb-when">2028</td>
            <td>Commissioning, then a six-month trial run of the plant against its design performance.</td>
            <td>Environmental engineering: the treatment process running.</td>
          </tr>
          <tr>
            <td className="kb-when">From May 2028</td>
            <td>Five years of operation and maintenance.</td>
            <td>Operations, maintenance and monitoring.</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>Tying the visit to the syllabus</h2>
      <h3>The treatment process</h3>
      <p>
        A sequencing batch reactor does in one tank what a conventional plant needs several tanks
        to do. Each basin fills, aerates, settles and decants in turn, and the four basins run the
        same cycle offset from one another so the plant never stops accepting flow. Students who
        have read about activated sludge can see why the design needs no separate clarifier. The
        cycle is drawn out on the <a href="/site#cycle">project overview</a>.
      </p>
      <h3>The network</h3>
      <p>
        Most of what the scheme builds is underground: 210 km of sewer, 3,728 manholes, 15,814 house
        chambers and ten pumping stations, nine intermediate and the main station at Habak. It is a
        practical lesson in why a sewer network needs lift stations where gravity alone cannot carry
        the flow, and in how much of a sanitation project is the last few metres to each house. Our
        note on <Link to="/site/blog/how-sewage-reaches-the-nishat-plant">how sewage will reach the
        plant</Link> walks through it.
      </p>
      <h3>How the project is run</h3>
      <p>
        The contract is EPC fixed-cost turnkey: survey, design, execution, commissioning and five
        years of operation under one contractor, with the design independently vetted before
        departmental approval. For construction management and MBA students, that is a working
        example of design-and-build delivery on a public project.
      </p>

      <h2>How to request a visit</h2>
      <p>
        Visits are at the discretion of the project and are fitted around site work, so none can be
        promised in advance. To ask:
      </p>
      <ul>
        <li>Write on the institution's letterhead, naming the department, the number of students and
          staff, two or three possible dates and the subject focus.</li>
        <li>Email it to the project office at <b>khilari.srinagar@gmail.com</b>, at least a few weeks
          before the dates.</li>
        <li>Expect a short group, led by site staff, with a safety briefing first. Everyone needs
          closed, sturdy shoes. Helmets and high-visibility vests are required on site; confirm with
          the project office whether the group should bring its own.</li>
        <li>Nobody enters an excavation, trench or working area, and photographs are taken only where
          the escort allows.</li>
      </ul>
      <p>
        Spring and autumn suit most groups. The coldest weeks of winter, Chillai Kalan, run from
        about 21 December to the end of January, with short days and nights below freezing.
      </p>

      <h2>Getting a college group to Srinagar</h2>
      <p>
        For most groups the cheapest way in is a train to Jammu Tawi or Katra, then the Vande Bharat
        into the valley, about three hours from Katra. The journey is itself worth a lesson for
        civil engineers: the line crosses the Chenab bridge and runs through the tunnels of the
        mountain railway. Timetables change with the season; Falcon Trails keeps a current guide
        to <TravelPartnerLink path="/kashmir/katra-to-srinagar">the train and road routes from Jammu
        and Katra</TravelPartnerLink>.
      </p>
      <p>
        If the department wants the plant to be one stop on a longer study tour, our travel partner
        Falcon Trails plans <TravelPartnerLink path="/educational-tours/college-tours">college study
        tours and industrial visits in Kashmir</TravelPartnerLink> around a department's syllabus,
        with transport, stays and the institution's letters handled in one place.
      </p>
    </>
  )
}
