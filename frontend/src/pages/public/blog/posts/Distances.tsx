import { Link } from 'react-router-dom'
import { TravelPartnerLink } from '../../TravelPartnerLink'

const FROM: [string, string, string][] = [
  ['Srinagar International Airport (SXR)', 'about 25 km', '45 min to 1 h'],
  ['Srinagar railway station, Nowgam', 'about 22 km', '45 min to 1 h'],
  ['Lal Chowk, the city centre', 'about 12 km', '25 to 40 min'],
  ['Dal Gate and the Boulevard', 'about 10 km', '20 to 30 min'],
  ['Habak, the main pumping station', 'about 6 km', '15 to 20 min'],
]

export default function Distances() {
  return (
    <>
      <p className="lead">
        Everyone who visits asks the same question in the cab from the airport. These are the road
        distances to Nishat from the places visitors usually start, with the time we would allow for
        the drive.
      </p>

      <div className="kb-table">
        <table>
          <thead>
            <tr><th scope="col">From</th><th scope="col">Road distance to Nishat</th><th scope="col">Allow</th></tr>
          </thead>
          <tbody>
            {FROM.map(([from, km, time]) => (
              <tr key={from}><td>{from}</td><td>{km}</td><td>{time}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Distances are by road to Nishat, measured with OpenStreetMap routing and rounded. The times
        are our allowance for city traffic; early mornings are quicker.
      </p>

      <h2>Getting around between work fronts</h2>
      <p>
        The scheme is spread across the city: the plant at Nishat, ten pumping stations including the
        main station at Habak, and sewer laying through the areas around the lake. A day that takes
        in the plant and a couple of network sites needs a vehicle for the day, not point-to-point
        cabs.
      </p>

      <h2>Arriving from outside the valley</h2>
      <p>
        Jammu is about 250 km from Srinagar by road, six to eight hours on the national highway. The
        Vande Bharat is quicker: about three hours from Katra. Our note on <Link to="/site/blog/vande-bharat-to-nishat-site">reaching
        the site by Vande Bharat</Link> covers the train and the drive from the station.
      </p>

      <h2>A weekend further afield</h2>
      <p>
        Visitors who stay over a weekend usually ask how far the hill stations are. From Srinagar,
        Gulmarg is about 50 km, Sonamarg about 80 km and Pahalgam about 95 km by road, each one and a
        half to three hours' drive. Falcon Trails' <TravelPartnerLink path="/kashmir/distances">Kashmir
        distance chart</TravelPartnerLink> has the drive times to every hill station and between them.
      </p>
    </>
  )
}
